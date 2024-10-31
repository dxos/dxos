//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { test } from 'vitest';

import { create, effectToJsonSchema, ref, TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { composeSchema } from './composition';
import {
  createEmptySchema,
  dynamicRef,
  setColumnSize,
  setProperty,
  ColumnSize,
  FieldKind,
  FieldValueType,
  type JsonPath,
  ViewPath,
  ViewSchema,
} from './types';

test('schema composition', ({ expect }) => {
  const TestSchema = S.Struct({
    name: S.String,
    email: S.String.pipe(FieldKind(FieldValueType.Email)),
  });

  const ProjectionSchema = S.Struct({
    name: S.String.pipe(ViewPath('$.name' as JsonPath)).pipe(ColumnSize(50)),
    email: S.String.pipe(ViewPath('$.email' as JsonPath)).pipe(ColumnSize(100)),
  });

  const testSchemaJson = effectToJsonSchema(TestSchema);
  const projectionSchemaJson = effectToJsonSchema(ProjectionSchema);

  const composedSchema = composeSchema(testSchemaJson, projectionSchemaJson);

  expect((composedSchema as any).properties).toEqual({
    name: {
      type: 'string',
      $echo: {
        annotations: { 'dxos.view': { path: '$.name', size: 50 } },
      },
    },
    email: {
      type: 'string',
      $echo: {
        annotations: {
          'dxos.view': { path: '$.email', size: 100 },
          'dxos.schema': { kind: 'email' },
        },
      },
    },
    // manager: {
    //   type: 'object',
    //   properties: {
    //     '/': {
    //       type: 'string',
    //     },
    //   },
    //   $echo: {
    //     kind: 'reference',
    //     referencedType: 'dxn:type:example.com/type/User',
    //   },
    // },
  });
  log.info('schema', { typeSchemaJson: testSchemaJson, projectionSchemaJson, composedSchema });
});

test('scratch', async () => {
  class Org extends TypedObject({ typename: 'example.com/Org', version: '0.1.0' })({
    name: S.String,
  }) {}

  class Person extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
    name: S.String,
    email: S.String.pipe(FieldKind(FieldValueType.Email)),
    org: ref(Org),
  }) {}

  log.info('schema', { org: effectToJsonSchema(Org), person: effectToJsonSchema(Person) });

  const org = create(Org, { name: 'Org' });

  const person = create(Person, { name: 'John', email: 'john@example.com', org });

  log.info('schema', { org, person });
});

test('scratch', async () => {
  // empty schema
  const orgSchema = createEmptySchema('example.com/Org', '0.1.0');

  // add name field
  setProperty(orgSchema.jsonSchema, 'name', S.String.annotations({ [AST.DescriptionAnnotationId]: 'Org name' }));

  log.info('org', { orgSchema });

  // empty schema
  const personSchema = createEmptySchema('example.com/Person', '0.1.0');

  // add name field
  setProperty(personSchema.jsonSchema, 'name', S.String.annotations({ [AST.DescriptionAnnotationId]: 'Person name' }));

  // add email field
  setProperty(
    personSchema.jsonSchema,
    'email',
    S.String.pipe(FieldKind(FieldValueType.Email)).annotations({ [AST.DescriptionAnnotationId]: 'Person email' }),
  );

  // add org field
  setProperty(
    personSchema.jsonSchema,
    'org',
    dynamicRef(orgSchema).annotations({ [AST.DescriptionAnnotationId]: 'Person org' }),
  );

  log.info('person', { personSchema });

  const personView = create(ViewSchema, {
    query: {
      __typename: personSchema.typename,
    },
    schema: effectToJsonSchema(
      S.Struct({
        name: S.String.pipe(ColumnSize(50)),
        email: S.String.pipe(ColumnSize(100)),
        org: dynamicRef(orgSchema).annotations({ [AST.DescriptionAnnotationId]: 'Person org' }),
      }),
    ),
  });

  // set column size for name field
  setColumnSize(personView.schema, 'name', 200);

  log.info('view', { personView });

  const composedSchema = composeSchema(
    JSON.parse(JSON.stringify(personSchema)).jsonSchema,
    JSON.parse(JSON.stringify(personView)).schema,
  );
  log.info('composed', { composedSchema });
});

/*

TODO:

$echo -> echo
annotations -> annotations
anyOf: ReactiveArray(2) [ { type: 'object' }, { type: 'array' } ], on effectToJsonSchema(S.Struct({}))

FieldMeta -> PropertyMeta

*/
