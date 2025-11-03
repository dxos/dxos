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
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';
import { JsonSchemaType } from '../../../echo/echo/dist/types/src/internal';

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
    dependencies: [DatabaseService],
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
    dependencies: [DatabaseService],
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
    dependencies: [DatabaseService],
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
    dependencies: [DatabaseService],
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
    dependencies: [DatabaseService],
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
    dependencies: [DatabaseService],
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
    dependencies: [DatabaseService],
  }),
);

export namespace SystemToolkit {
  export const Toolkit = Toolkit$;

  export const tools = Record.keys(Toolkit$.tools);

  export const createLayer = (context: PluginContext): Layer.Layer<Tool.Handler<any>, never, never> =>
    Toolkit$.toLayer({
      'schema-list': Effect.fnUntraced(function* () {
        const { db } = yield* DatabaseService;
        const schema = yield* Effect.promise(() =>
          db.schemaRegistry.query({ location: ['database', 'runtime'] }).run(),
        );

        return schema.map((schema) => {
          const meta = Type.getMeta(schema);
          return {
            typename: Type.getTypename(schema),
            jsonSchema: Type.toJsonSchema(schema),
            kind: meta?.sourceSchema ? 'relation' : 'record',
          };
        });
      }),

      'schema-add': Effect.fnUntraced(function* ({ name, typename, jsonSchema }) {
        const { db } = yield* DatabaseService;

        db.schemaRegistry.register([
          {
            typename,
            version: '0.1.0',
            jsonSchema,
            name,
          },
        ]);
      }),

      'object-create': Effect.fnUntraced(function* ({ typename, data }) {
        const { db } = yield* DatabaseService;
        const schema = yield* Effect.promise(() =>
          db.schemaRegistry.query({ typename, location: ['database', 'runtime'] }).first(),
        );

        const object = db.add(Obj.make(schema, data));
        // TODO(dmaretskyi): How to add object to a collection???
        return object;
      }),

      'object-remove': Effect.fnUntraced(function* ({ id }) {
        const { db } = yield* DatabaseService;
        const object = yield* DatabaseService.resolve(DXN.parse(id));
        db.remove(object);
        return object;
      }),

      'relation-create': Effect.fnUntraced(function* ({ typename, source, target, data }) {
        const { db } = yield* DatabaseService;
        const schema = yield* Effect.promise(() =>
          db.schemaRegistry.query({ typename, location: ['database', 'runtime'] }).first(),
        );

        const sourceObj = yield* DatabaseService.resolve(DXN.parse(source));
        const targetObj = yield* DatabaseService.resolve(DXN.parse(target));
        const relation = db.add(
          Relation.make(schema, {
            [Relation.Source]: sourceObj,
            [Relation.Target]: targetObj,
            ...data,
          }),
        );
        return relation;
      }),

      'tag-add': Effect.fnUntraced(function* ({ tagId, objectId }) {
        const { db } = yield* DatabaseService;

        const object = yield* DatabaseService.resolve(DXN.parse(objectId));
        Obj.addTag(object, DXN.parse(tagId).toString());
        return object;
      }),

      'tag-remove': Effect.fnUntraced(function* ({ tagId, objectId }) {
        const { db } = yield* DatabaseService;

        const object = yield* DatabaseService.resolve(DXN.parse(objectId));
        Obj.removeTag(object, DXN.parse(tagId).toString());
        return object;
      }),
    });
}
