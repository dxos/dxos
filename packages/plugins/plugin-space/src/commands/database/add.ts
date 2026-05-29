//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

// eslint-disable-next-line unused-imports/no-unused-imports
import { type Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { CommandConfig, Common, flushAndSync, print, spaceLayer } from '@dxos/cli-util';
import { SpaceProperties } from '@dxos/client/echo';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Operation } from '@dxos/compute';
import { Collection, Database, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { EntityKind, SystemTypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';

import { SpaceCapabilities } from '#types';

import { printObject } from './util';

export const add = Command.make(
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

      const [properties] = yield* Database.runQuery(Filter.type(SpaceProperties));
      const collection = yield* Database.load<Collection.Collection>(
        properties[Type.getTypename(Collection.Collection)],
      );

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
  const allTypes = yield* Database.runQuery(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()));
  const types = allTypes
    .filter((schema) => !SystemTypeAnnotation.get(Type.getSchema(schema)).pipe(Option.getOrElse(() => false)))
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
