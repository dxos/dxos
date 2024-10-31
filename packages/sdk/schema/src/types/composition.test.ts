//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { describe, test } from 'vitest';

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

describe.only('schema composition', () => {
  test('schema composition', ({ expect }) => {
    class PersonType extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String.pipe(FieldKind(FieldValueType.Email)),
    }) {}

    const ViewSchema = S.Struct({
      name: S.String.pipe(ViewPath('$.name' as JsonPath)).pipe(ColumnSize(50)),
      email: S.String.pipe(ViewPath('$.email' as JsonPath)).pipe(ColumnSize(100)),
    });

    const personSchema = effectToJsonSchema(PersonType);
    const viewSchema = effectToJsonSchema(ViewSchema);

    const composedSchema = composeSchema(personSchema, viewSchema);
    expect((composedSchema as any).properties).toEqual({
      name: {
        type: 'string',
        $echo: {
          annotations: {
            'dxos.view': { path: '$.name', size: 50 },
          },
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
    });

    log.info('schema', { typeSchemaJson: personSchema, viewSchema, composedSchema });
  });

  test('static schema definitions with references', async () => {
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      name: S.String,
    }) {}

    class Person extends TypedObject({ typename: 'example.com/type/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String.pipe(FieldKind(FieldValueType.Email)),
      org: ref(Org),
    }) {}

    log.info('schema', { org: effectToJsonSchema(Org), person: effectToJsonSchema(Person) });

    const org = create(Org, { name: 'Org' });
    const person = create(Person, { name: 'John', email: 'john@example.com', org });

    log.info('schema', { org, person });
  });

  test('dynamic schema definitions with references', async () => {
    const orgSchema = createEmptySchema('example.com/type/Org', '0.1.0');
    setProperty(orgSchema.jsonSchema, 'name', S.String.annotations({ [AST.DescriptionAnnotationId]: 'Org name' }));
    log.info('org', { orgSchema });

    const personSchema = createEmptySchema('example.com/type/Person', '0.1.0');
    setProperty(
      personSchema.jsonSchema,
      'name',
      S.String.annotations({
        [AST.DescriptionAnnotationId]: 'Full name',
      }),
    );

    setProperty(
      personSchema.jsonSchema,
      'email',
      S.String.pipe(FieldKind(FieldValueType.Email)).annotations({ [AST.DescriptionAnnotationId]: 'Primary email' }),
    );

    setProperty(
      personSchema.jsonSchema,
      'org',
      dynamicRef(orgSchema).annotations({ [AST.DescriptionAnnotationId]: 'Employer' }),
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
          org: dynamicRef(orgSchema).annotations({ [AST.DescriptionAnnotationId]: 'Employer' }),
        }),
      ),
    });

    // Update column size.
    setColumnSize(personView.schema, 'name', 200);
    log.info('view', { personView });

    const composedSchema = composeSchema(
      JSON.parse(JSON.stringify(personSchema)).jsonSchema,
      JSON.parse(JSON.stringify(personView)).schema,
    );
    log.info('composed', { composedSchema });
  });
});
