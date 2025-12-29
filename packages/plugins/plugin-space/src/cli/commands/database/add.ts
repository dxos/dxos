//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import { Common as AppFrameworkCommon, PluginManager } from '@dxos/app-framework';
import { CommandConfig, Common, flushAndSync, print, spaceLayer } from '@dxos/cli-util';
import { SpaceProperties } from '@dxos/client/echo';
import { Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import { EntityKind, getTypeAnnotation } from '@dxos/echo/internal';
import { Collection } from '@dxos/schema';

import { type CreateObjectIntent } from '../../../types';

import { printObject } from './util';

export type Metadata = {
  createObjectIntent: CreateObjectIntent;
  inputSchema?: Schema.Schema.AnyNoContext;
  addToCollectionOnCreate?: boolean;
};

export const add = Command.make(
  'add',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    typename: Options.text('typename').pipe(Options.withDescription('The typename to create.'), Options.optional),
  },
  ({ typename }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const manager = yield* PluginManager.Service;
      const { db } = yield* Database.Service;

      yield* manager.context.activate(AppFrameworkCommon.ActivationEvent.SetupMetadata);

      const resolve = (typename: string) => {
        const metadata = manager.context
          .getCapabilities(AppFrameworkCommon.Capability.Metadata)
          .find(({ id }) => id === typename)?.metadata;
        return metadata?.createObjectIntent ? (metadata as Metadata) : undefined;
      };

      const [properties] = yield* Database.Service.runQuery(Filter.type(SpaceProperties));
      const collection = yield* Database.Service.load<Collection.Collection>(
        properties[Collection.Collection.typename],
      );

      const selectedTypename = yield* Option.match(typename, {
        onNone: () => selectTypename(resolve),
        onSome: (t) => Effect.succeed(t),
      });
      const metadata = resolve(selectedTypename);
      if (!metadata) {
        return yield* Effect.fail(new Error(`Unknown typename: ${selectedTypename}`));
      }

      const { dispatch } = manager.context.getCapability(AppFrameworkCommon.Capability.IntentDispatcher);
      const { object } = yield* dispatch(metadata.createObjectIntent({}, { db }));
      if (!Obj.isObject(object)) {
        return yield* Effect.fail(new Error(`Invalid object: ${object}`));
      }

      collection.objects.push(Ref.make(object));

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
const selectTypename = Effect.fn(function* (resolve: (typename: string) => Metadata | undefined) {
  const schemas = yield* Database.Service.runSchemaQuery({
    location: ['database', 'runtime'],
    includeSystem: false,
  }).pipe(
    Effect.map((schemas) => schemas.filter((schema) => getTypeAnnotation(schema)?.kind !== EntityKind.Relation)),
    Effect.map((schemas) => schemas.filter((schema) => !!resolve(Type.getTypename(schema)))),
  );

  const choices = schemas.map((schema) => ({
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
