//
// Copyright 2025 DXOS.org
//

import { AiTool, AiToolkit } from '@effect/ai';
import { Effect, Schema } from 'effect';

import { Capabilities, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { Filter, Obj, Type } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapabilities, getActiveSpace } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

class SchemaToolkit extends AiToolkit.make(
  AiTool.make('get-schemas', {
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
  AiTool.make('create-record', {
    description: trim`
      Creates a new record.
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
    SchemaToolkit.toLayer({
      //
      'get-schemas': () => {
        const space = getActiveSpace(context);
        const service = space ? DatabaseService.makeLayer(space.db) : DatabaseService.notAvailable;
        return Effect.gen(function* () {
          const forms = context.getCapabilities(SpaceCapabilities.ObjectForm).map((form) => ({
            typename: Type.getTypename(form.objectSchema),
            jsonSchema: Type.toJsonSchema(form.objectSchema),
            kind: 'item',
          }));
          const allowed = context
            .getCapabilities(ClientCapabilities.SchemaWhiteList)
            .flat()
            .map((schema) => ({
              typename: Type.getTypename(schema),
              jsonSchema: Type.toJsonSchema(schema),
              kind: 'record',
            }));
          const schemas = [...forms, ...allowed];
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
          return schemas.map((schema) => schema.typename);
        }).pipe(Effect.provide(service));
      },

      //
      'create-record': ({ typename, data }) => {
        const space = getActiveSpace(context);
        const service = space ? DatabaseService.makeLayer(space.db) : DatabaseService.notAvailable;
        console.log('create-record', { typename, data, space });
        return Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const schemas = context.getCapabilities(ClientCapabilities.SchemaWhiteList).flat();
          const { objects } = yield* DatabaseService.runQuery(Filter.type(DataType.StoredSchema));
          schemas.push(...objects.map((object) => Type.toEffectSchema(object.jsonSchema)));

          const schema = schemas.find((schema) => Type.getTypename(schema) === typename);
          if (!schema) {
            throw new Error(`Schema not found for ${typename}`);
          }

          const object = Obj.make(schema, data);
          yield* dispatch(createIntent(SpaceAction.AddObject, { object, target: space!, hidden: true }));
          return object;
        }).pipe(Effect.provide(service), Effect.orDie);
      },
    });
}

export default (context: PluginContext) => [
  contributes(Capabilities.Toolkit, SchemaToolkit),
  contributes(Capabilities.ToolkitHandler, SchemaToolkit.layer(context)),
];
