//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import type * as Terminal from '@effect/platform/Terminal';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, RootCollectionAnnotation } from '@dxos/app-toolkit';
import { CommandConfig, Common, type SpaceNotFoundError, flushAndSync, print, spaceLayer } from '@dxos/cli-util';
import { type ClientService } from '@dxos/client';
import { SpaceProperties } from '@dxos/client/echo';
import type { Operation } from '@dxos/compute';
import { Annotation, Collection, Database, type Err, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { HiddenAnnotation, getTypeAnnotation } from '@dxos/echo/Annotation';
import { type SpaceId } from '@dxos/keys';
import { Kind as EntityKind } from '@dxos/echo/Entity';

import { SpaceCapabilities } from '#types';

import { printObject } from './util';

// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).
export const add: Command.Command<
  'add',
  ClientService | CommandConfig | Operation.Service | Plugin.Service | Capability.Service | Terminal.Terminal,
  Err.EntityNotFoundError | Error | SpaceNotFoundError,
  { readonly spaceId: Option.Option<SpaceId>; readonly typename: Option.Option<string> }
> = Command.make(
  'add',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    typename: Options.text('typename').pipe(Options.withDescription('The typename to create.'), Options.optional),
  },
  ({ typename }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const manager = yield* Plugin.Service;
      const { db } = yield* Database.Service;

      yield* manager.activate(AppActivationEvents.SetupSchema);

      const resolve = (typename: string) => {
        const entry = manager.capabilities
          .getAll(SpaceCapabilities.CreateObjectEntry)
          .find(({ id }) => id === typename);
        return entry ?? undefined;
      };

      const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
      const rootCollectionRef = Annotation.get(properties, RootCollectionAnnotation).pipe(Option.getOrUndefined);
      const collection = rootCollectionRef ? yield* Database.load<Collection.Collection>(rootCollectionRef) : undefined;

      const selectedTypename = yield* Option.match(typename, {
        onNone: () => selectTypename(resolve),
        onSome: (t) => Effect.succeed(t),
      });
      const metadata = resolve(selectedTypename);
      if (!metadata) {
        return yield* Effect.fail(new Error(`Unknown typename: ${selectedTypename}`));
      }

      const result = yield* metadata.createObject({}, { db, target: collection ?? db });
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
