//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';
import * as Prompt from 'effect/unstable/cli/Prompt';

import type * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import { CommandConfig, Common, type SpaceNotFoundError, flushAndSync, print, spaceLayer } from '@dxos/cli-util';
import { type ClientService } from '@dxos/client';
import { SpaceProperties } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Collection, Database, type Error as EchoError, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { HiddenAnnotation, getTypeAnnotation } from '@dxos/echo/Annotation';
import { Kind as EntityKind } from '@dxos/echo/Entity';
import { type SpaceId } from '@dxos/keys';

import { SpaceCapabilities, SpaceEvents } from '#types';

import { printObject } from './util.ts';

// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).
export const add: Command.Command<
  'add',
  { readonly spaceId: Option.Option<SpaceId>; readonly typename: Option.Option<string> },
  {},
  EchoError.EntityNotFoundError | Error | SpaceNotFoundError,
  ClientService | CommandConfig | Operation.Service | Plugin.Service | Capability.Service | Prompt.Environment
> = Command.make(
  'add',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    typename: Options.string('typename').pipe(Options.withDescription('The typename to create.'), Options.optional),
  },
  ({ typename }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const manager = yield* Plugin.Service;
      const { db } = yield* Database.Service;

      // Ensures the dependency pass has run, then fires the create-flow demand event —
      // `SpaceCapabilities.CreateObjectEntry` providers are gated on it by default and must
      // have contributed before they're queried below.
      yield* manager.start();
      yield* manager.activate(SpaceEvents.CreateObjectRequested);

      const resolve = (typename: string) => {
        const entry = manager.capabilities
          .getAll(SpaceCapabilities.CreateObjectEntry)
          .find(({ id }) => id === typename);
        return entry ?? undefined;
      };

      const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
      const rootCollectionRef = Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(
        Option.getOrUndefined,
      );
      const collection = rootCollectionRef ? yield* Database.load<Collection.Collection>(rootCollectionRef) : undefined;

      const selectedTypename = yield* Option.match(typename, {
        onNone: () => selectTypename(resolve),
        onSome: (t) => Effect.succeed(t),
      });
      const metadata = resolve(selectedTypename);
      if (!metadata) {
        return yield* Effect.fail(new Error(`Unknown typename: ${selectedTypename}`));
      }

      const result = yield* metadata.createObject({}, { db, target: collection });
      const object = result.object;
      if (!Obj.isObject(object)) {
        return yield* Effect.fail(new Error(`Invalid object: ${object}`));
      }

      if (json) {
        yield* Console.log(JSON.stringify(object, null, 2));
      } else {
        yield* Console.log(print(printObject(object)));
      }

      yield* flushAndSync({ indexes: true });
    }),
).pipe(
  Command.withDescription('Add an object to a space.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);

/**
 * Prompts for typename selection if not provided.
 */
const selectTypename = Effect.fn(function* (
  resolve: (typename: string) => SpaceCapabilities.CreateObjectEntry | undefined,
) {
  const { db } = yield* Database.Service;
  const allTypes = yield* Database.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()))
    .run;
  const types = allTypes
    .filter((schema) => !HiddenAnnotation.get(Type.getSchema(schema)).pipe(Option.getOrElse(() => false)))
    .filter((schema) => getTypeAnnotation(Type.getSchema(schema))?.kind !== EntityKind.Relation)
    .filter((schema) => !!resolve(Type.getTypename(schema)));

  const choices = types.map((schema) => ({
    // TODO(wittjosiah): Translations.
    title: Type.getTypename(schema),
    value: Type.getTypename(schema),
    description: Type.getTypename(schema),
  }));

  const selected = yield* Prompt.select({
    message: 'Select a type:',
    choices,
  });

  return selected;
});
