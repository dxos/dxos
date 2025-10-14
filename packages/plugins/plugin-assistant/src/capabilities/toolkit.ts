//
// Copyright 2025 DXOS.org
//

import { Tool, Toolkit } from '@effect/ai';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capabilities, type Capability, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { AiContextService, ArtifactId } from '@dxos/assistant';
import { WebSearchToolkit } from '@dxos/assistant-testing';
import { Filter, Obj, Ref, SchemaNotFoundError, Type } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapabilities, getActiveSpace } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

// TODO(burdon): Reconcile with functions (currently reuses plugin framework intents).
class AssistantToolkit extends Toolkit.make(
  Tool.make('add-to-context', {
    description: trim`
      Adds the object to the chat context.
    `,
    parameters: {
      id: ArtifactId.annotations({
        description: 'The ID of the document to read.',
      }),
    },
    success: Schema.Void,
    failure: Schema.Never,
    dependencies: [AiContextService, DatabaseService],
  }),

  Tool.make('get-schemas', {
    description: trim`
      Retrieves schemas definitions.
    `,
    parameters: {
      // TODO(wittjosiah): Remove this once parameter-less tools are fixed.
      limit: Schema.Number,
    },
    // TODO(dmaretskyi): Effect returns ({ result, encodedResult })
    success: Schema.Any,
    failure: Schema.Never,
  }),

  Tool.make('add-schema', {
    description: trim`
      Adds a schema to the space.
      The name will be used when displayed to the user.
      The typename must be in the format of "example.com/type/Type".
    `,
    parameters: {
      name: Schema.String,
      typename: Schema.String,
      jsonSchema: Schema.Any,
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),

  Tool.make('create-record', {
    description: trim`
      Creates a new record and adds it to the current space.
      Get the schema from the get-schemas tool and ensure that the data matches the corresponding schema.
      Note that only record schemas are supported.
    `,
    parameters: {
      typename: Schema.String,
      data: Schema.Any,
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),
) {
  static layer = (context: PluginContext) =>
    AssistantToolkit.toLayer({
      'add-to-context': Effect.fnUntraced(function* ({ id }) {
        const { binder } = yield* AiContextService;
        const { db } = yield* DatabaseService;
        const ref = Ref.fromDXN(ArtifactId.toDXN(id, db.spaceId));
        yield* Effect.promise(() =>
          binder.bind({
            blueprints: [],
            objects: [ref],
          }),
        );
      }),

      'get-schemas': () => {
        const space = getActiveSpace(context);
        invariant(space, 'No active space');

        return Effect.gen(function* () {
          const whitelist = context
            .getCapabilities(ClientCapabilities.SchemaWhiteList)
            .flat()
            .map((schema) => ({
              typename: Type.getTypename(schema),
              jsonSchema: Type.toJsonSchema(schema),
              kind: 'record',
            }));

          // TODO(burdon): Why ObjectForm (bad name for data capability; UI term)?
          const forms = context.getCapabilities(SpaceCapabilities.ObjectForm).map((form) => ({
            typename: Type.getTypename(form.objectSchema),
            jsonSchema: Type.toJsonSchema(form.objectSchema),
            kind: 'item',
          }));

          const schemas = [...whitelist, ...forms];
          if (space) {
            const { objects } = yield* DatabaseService.runQuery(Filter.type(DataType.StoredSchema));
            schemas.push(
              ...objects.map((object) => ({
                typename: object.typename,
                jsonSchema: object.jsonSchema,
                kind: 'record',
              })),
            );
          }

          return schemas;
        }).pipe(Effect.provide(DatabaseService.layer(space.db)));
      },

      'add-schema': ({ name, typename, jsonSchema }) => {
        return Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const space = getActiveSpace(context);
          invariant(space, 'No active space');

          const schema = Type.toEffectSchema(jsonSchema).pipe(Type.Obj({ typename, version: '0.1.0' }));
          yield* dispatch(createIntent(SpaceAction.AddSchema, { space, name, typename, schema }));
        }).pipe(Effect.orDie);
      },

      'create-record': ({ typename, data }) => {
        const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        const space = getActiveSpace(context);
        invariant(space, 'No active space');

        return Effect.gen(function* () {
          const schemas = context.getCapabilities(ClientCapabilities.SchemaWhiteList).flat();
          const { objects } = yield* DatabaseService.runQuery(Filter.type(DataType.StoredSchema));
          schemas.push(...objects.map((object) => Type.toEffectSchema(object.jsonSchema)));
          const schema = schemas.find((schema) => Type.getTypename(schema) === typename);
          if (!schema) {
            throw new SchemaNotFoundError(typename);
          }

          const object = Obj.make(schema, data);
          yield* dispatch(createIntent(SpaceAction.AddObject, { object, target: space, hidden: true }));
          return object;
        }).pipe(Effect.provide(DatabaseService.layer(space.db)), Effect.orDie);
      },
    });
}

export default (context: PluginContext): Capability<any>[] => [
  contributes(Capabilities.Toolkit, AssistantToolkit),
  contributes(Capabilities.ToolkitHandler, AssistantToolkit.layer(context)),
  contributes(Capabilities.Toolkit, WebSearchToolkit),
];
