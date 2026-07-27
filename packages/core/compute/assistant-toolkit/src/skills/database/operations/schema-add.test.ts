//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Filter, JsonSchema, Query, Scope, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { OperationTestLayer } from '../../../testing';
import { SchemaAdd } from './definitions';

EntityId.dangerouslyDisableRandomness();

// A representative draft-07 JSON Schema as a model would emit for the `add-schema` tool.
const PROJECT_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Project',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string' },
  },
  required: ['name'],
};

describe('SchemaAdd', () => {
  it.effect(
    'schema-add: requires jsonSchema to be an object',
    Effect.fnUntraced(function* ({ expect }) {
      // The tool parameter is typed as an object so the model emits the JSON Schema as an object.
      // An unconstrained parameter let some models emit a JSON-encoded string, which then corrupted
      // the created type; a non-object is now rejected at the tool-call boundary.
      const decode = Schema.decodeUnknown(SchemaAdd.input);
      const base = { name: 'Project', typename: 'com.example.type.project' };

      const fromObject = yield* decode({ ...base, jsonSchema: PROJECT_JSON_SCHEMA });
      expect(fromObject.jsonSchema).toEqual(PROJECT_JSON_SCHEMA);

      const fromString = yield* Effect.either(decode({ ...base, jsonSchema: JSON.stringify(PROJECT_JSON_SCHEMA) }));
      expect(fromString._tag).toBe('Left');
    }),
  );

  it.effect(
    'schema-add: creates a schema with the declared fields',
    Effect.fnUntraced(
      function* ({ expect }) {
        // Run the handler and assert the created type carries the declared fields, not merely that a
        // type with the typename exists.
        yield* Operation.invoke(SchemaAdd, {
          name: 'Project',
          typename: 'com.example.type.project',
          jsonSchema: PROJECT_JSON_SCHEMA,
        });

        const allTypes = yield* Database.query(
          Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()),
        ).run;
        const schemas = allTypes.filter((type) => Type.getTypename(type) === 'com.example.type.project');
        expect(schemas).toHaveLength(1);
        expectSchemaProperties(schemas[0], ['name', 'description', 'status']);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Asserts that the type's JSON Schema declares (at least) the given property names.
const expectSchemaProperties = (schema: Parameters<typeof JsonSchema.toJsonSchema>[0], expectedKeys: string[]) => {
  const properties = JsonSchema.toJsonSchema(schema).properties ?? {};
  expect(Object.keys(properties)).toEqual(expect.arrayContaining(expectedKeys));
};
