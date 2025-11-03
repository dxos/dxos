//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';

import { Capabilities, type PluginContext, createIntent } from '@dxos/app-framework';
import { ArtifactId } from '@dxos/assistant';
import { DXN, Filter, Obj, Relation, SchemaNotFoundError, Tag, Type } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapabilities, getActiveSpace } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

// TODO(burdon): Factor out (is there a way to remove plugin deps?)
// TODO(burdon): Reconcile with functions (currently reuses plugin framework intents).

const Toolkit$ = Toolkit.make(
  //
  // Schema
  //

  Tool.make('schema-list', {
    description: trim`
      Lists schemas definitions.
    `,
    parameters: {
      // TODO(wittjosiah): Remove this once parameter-less tools are fixed.
      limit: Schema.Number,
    },
    // TODO(dmaretskyi): Effect returns ({ result, encodedResult })
    success: Schema.Any,
    failure: Schema.Never,
  }),

  Tool.make('schema-add', {
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

  //
  // Objects
  //

  Tool.make('object-create', {
    description: trim`
      Creates a new object and adds it to the current space.
      Get the schema from the schema-list tool and ensure that the data matches the corresponding schema.
    `,
    parameters: {
      typename: Schema.String,
      data: Schema.Any,
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),

  Tool.make('object-remove', {
    description: trim`
      Removes an object or relation from the database.
    `,
    parameters: {
      id: ArtifactId.annotations({
        description: 'The ID of the object.',
      }),
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),

  //
  // Relations
  //

  Tool.make('relation-create', {
    description: trim`
      Creates a new relation and adds it to the current space.
      Get the schema from the schema-list tool and ensure that the data matches the corresponding schema.
    `,
    parameters: {
      typename: Schema.String,
      source: ArtifactId.annotations({
        description: 'The ID of the source object.',
      }),
      target: ArtifactId.annotations({
        description: 'The ID of the target object.',
      }),
      data: Schema.Any.annotations({
        description: 'The data to be stored in the relation.',
      }),
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),

  //
  // Tags
  //

  Tool.make('tag-add', {
    description: trim`
      Adds a tag to an object.
      Tags are objects of type ${Tag.Tag.typename}.
    `,
    parameters: {
      tagId: ArtifactId.annotations({
        description: 'The ID of the tag.',
      }),
      objectId: ArtifactId.annotations({
        description: 'The ID of the object.',
      }),
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),

  Tool.make('tag-remove', {
    description: trim`
      Removes a tag from an object.
      Tags are objects of type ${Tag.Tag.typename}.
    `,
    parameters: {
      tagId: ArtifactId.annotations({
        description: 'The ID of the tag.',
      }),
      objectId: ArtifactId.annotations({
        description: 'The ID of the object.',
      }),
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),
);

/**
 * @deprecated Moved to assistant-toolkit
 */
export namespace SystemToolkit {
  export const Toolkit = Toolkit$;

  export const tools = Record.keys(Toolkit$.tools);

  export const createLayer = (context: PluginContext): Layer.Layer<Tool.Handler<any>, never, never> =>
    Toolkit$.toLayer({
      'schema-list': () => {
        const space = getActiveSpace(context);
        invariant(space, 'No active space');

        return Effect.gen(function* () {
          const registered = context
            // TODO(burdon): Can we remove plugin dependency? Get from layer?
            .getCapabilities(ClientCapabilities.Schema)
            .flat()
            .map((schema) => {
              const meta = Type.getMeta(schema);
              return {
                typename: Type.getTypename(schema),
                jsonSchema: Type.toJsonSchema(schema),
                kind: meta?.sourceSchema ? 'relation' : 'record',
              };
            });

          // TODO(burdon): Can we remove plugin dependency? Get from layer?
          const forms = context.getCapabilities(SpaceCapabilities.ObjectForm).map((form) => ({
            typename: Type.getTypename(form.objectSchema),
            jsonSchema: Type.toJsonSchema(form.objectSchema),
            kind: 'item',
          }));

          const schemas = [...registered, ...forms];
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

      'schema-add': ({ name, typename, jsonSchema }) => {
        return Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const space = getActiveSpace(context);
          invariant(space, 'No active space');

          const schema = Type.toEffectSchema(jsonSchema).pipe(Type.Obj({ typename, version: '0.1.0' }));
          yield* dispatch(createIntent(SpaceAction.AddSchema, { space, name, typename, schema }));
        }).pipe(Effect.orDie);
      },

      'object-create': ({ typename, data }) => {
        const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        const space = getActiveSpace(context);
        invariant(space, 'No active space');

        return Effect.gen(function* () {
          const schemas = context.getCapabilities(ClientCapabilities.Schema).flat();
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

      'object-remove': ({ id }) => {
        const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        const space = getActiveSpace(context);
        invariant(space, 'No active space');

        return Effect.gen(function* () {
          const object = yield* DatabaseService.resolve(DXN.parse(id));
          yield* dispatch(createIntent(SpaceAction.RemoveObjects, { objects: [object] }));
          return object;
        }).pipe(Effect.provide(DatabaseService.layer(space.db)), Effect.orDie);
      },

      'relation-create': ({ typename, source, target, data }) => {
        const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        const space = getActiveSpace(context);
        invariant(space, 'No active space');

        return Effect.gen(function* () {
          const schemas = context.getCapabilities(ClientCapabilities.Schema).flat();
          const schema = schemas.find((schema) => Type.getTypename(schema) === typename);
          if (!schema) {
            throw new SchemaNotFoundError(typename);
          }

          const sourceObj = yield* DatabaseService.resolve(DXN.parse(source));
          const targetObj = yield* DatabaseService.resolve(DXN.parse(target));
          const relation = Relation.make(schema, {
            [Relation.Source]: sourceObj,
            [Relation.Target]: targetObj,
            ...data,
          });
          yield* dispatch(createIntent(SpaceAction.AddObject, { object: relation, target: space, hidden: true }));
          return relation;
        }).pipe(Effect.provide(DatabaseService.layer(space.db)), Effect.orDie);
      },

      'tag-add': ({ tagId, objectId }) => {
        const space = getActiveSpace(context);
        invariant(space, 'No active space');

        return Effect.gen(function* () {
          const object = yield* DatabaseService.resolve(DXN.parse(objectId));
          const meta = Obj.getMeta(object);
          meta.tags = [DXN.parse(tagId).toString()];
          return object;
        }).pipe(Effect.provide(DatabaseService.layer(space.db)), Effect.orDie);
      },

      'tag-remove': ({ tagId, objectId }) => {
        const space = getActiveSpace(context);
        invariant(space, 'No active space');

        return Effect.gen(function* () {
          const object = yield* DatabaseService.resolve(DXN.parse(objectId));
          const meta = Obj.getMeta(object);
          meta.tags = meta.tags?.filter((tag) => tag !== DXN.parse(tagId).toString());
          return object;
        }).pipe(Effect.provide(DatabaseService.layer(space.db)), Effect.orDie);
      },
    });
}
