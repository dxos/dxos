//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, JsonSchema, Obj, Query, Relation, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import AddObjectHandler from './add-object.ts';
import AddRelationHandler from './add-relation.ts';
import AddTypeHandler from './add-type.ts';
import QueryObjectsHandler from './query-objects.ts';
import QueryTypesHandler from './query-types.ts';
import { TestObject, decodeTypeRow, makeTestLayer } from './testing.ts';

const TestLayer = makeTestLayer(
  AddTypeHandler,
  AddObjectHandler,
  AddRelationHandler,
  QueryObjectsHandler,
  QueryTypesHandler,
);

const statementSchema = {
  type: 'object',
  properties: { text: { type: 'string' }, speaker: { type: 'string' } },
};

describe('SpaceOperation.AddType', () => {
  it.effect(
    'builds the type from JSON Schema, as a remote caller supplies it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { object } = yield* Operation.invoke(SpaceOperation.AddType, {
          typename: 'com.example.type.project',
          name: 'Project',
          jsonSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            title: 'Project',
            properties: { name: { type: 'string' }, status: { type: 'string' } },
            required: ['name'],
          },
        });

        expect(Type.getTypename(object)).toBe('com.example.type.project');
        // Registered in the space, so the object verbs can create instances of it next.
        const { types } = yield* Operation.invoke(SpaceOperation.QueryTypes, {});
        expect(types.map((type) => decodeTypeRow(type).typename)).toContain('com.example.type.project');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a type described without an `id` property can hold objects',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Operation.invoke(SpaceOperation.AddType, {
          typename: 'com.example.type.statement',
          jsonSchema: statementSchema,
        });

        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: { '@type': 'com.example.type.statement', 'text': 'hello', 'speaker': 'alice' },
        });
        expect(Obj.getTypename(object)).toBe('com.example.type.statement');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a typename query finds the objects of a type described at runtime',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Operation.invoke(SpaceOperation.AddType, {
          typename: 'com.example.type.inquiry',
          jsonSchema: statementSchema,
        });
        yield* Operation.invoke(SpaceOperation.AddObject, {
          object: { '@type': 'com.example.type.inquiry', 'text': 'why?' },
        });
        yield* Database.flush();

        const { results } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
          typename: 'com.example.type.inquiry',
          limit: 50,
        });
        expect(results).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a new version of a typename stores a new definition',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { id: first } = yield* Operation.invoke(SpaceOperation.AddType, {
          typename: 'com.example.type.revised',
          version: '0.1.0',
          jsonSchema: statementSchema,
        });
        const { id: second, object } = yield* Operation.invoke(SpaceOperation.AddType, {
          typename: 'com.example.type.revised',
          version: '0.2.0',
          jsonSchema: { ...statementSchema, properties: { ...statementSchema.properties, source: { type: 'string' } } },
        });

        expect(second).not.toBe(first);
        expect(Type.getMeta(object).version).toBe('0.2.0');
        expect(Object.keys(JsonSchema.toJsonSchema(object).properties ?? {})).toContain('source');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'describes a relation type that relations can then be made of',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { object: type } = yield* Operation.invoke(SpaceOperation.AddType, {
          typename: 'com.example.relation.valueInput',
          jsonSchema: {
            type: 'object',
            entityKind: 'relation',
            relationSource: { $ref: 'dxn:org.dxos.schema.anyObject' },
            relationTarget: { $ref: 'dxn:org.dxos.schema.anyObject' },
            properties: { basis: { type: 'string', enum: ['direct', 'inferred'] } },
          },
        });
        expect(Type.isRelation(type)).toBe(true);

        const source = yield* Database.add(Obj.make(TestObject, { name: 'source' }));
        const target = yield* Database.add(Obj.make(TestObject, { name: 'target' }));
        yield* Database.flush();
        yield* Operation.invoke(SpaceOperation.AddRelation, {
          typename: 'com.example.relation.valueInput',
          source,
          target,
          fields: { basis: 'direct' },
        });

        const relations = yield* Database.query(Query.select(Filter.type(type))).run;
        const [relation] = relations.filter(Relation.isRelation);
        expect(relations).toHaveLength(1);
        expect(Relation.getSource(relation).id).toBe(source.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
