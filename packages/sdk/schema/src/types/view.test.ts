//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  FormatAnnotationId,
  FormatEnum,
  TypedObject,
  create,
  createReferenceAnnotation,
  createStoredSchema,
  getTypename,
  ref,
  toJsonSchema,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { createView } from './view';

describe('View', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('static schema definitions with references', async ({ expect }) => {
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      name: S.String,
    }) {}

    class Person extends TypedObject({ typename: 'example.com/type/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String.annotations({ [FormatAnnotationId]: FormatEnum.Email }),
      org: ref(Org),
    }) {}

    const org = create(Org, { name: 'Org' });
    const person = create(Person, { name: 'Alice', email: 'alice@example.com', org });
    log('schema', { org: toJsonSchema(Org), person: toJsonSchema(Person) });
    log('objects', { org, person });
    expect(getTypename(org)).to.eq(Org.typename);
    expect(getTypename(person)).to.eq(Person.typename);
  });

  test('create view from TypedObject', async ({ expect }) => {
    class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({}) {}
    const view = createView({ typename: TestSchema.typename, jsonSchema: toJsonSchema(TestSchema) });
    expect(view.query.__typename).to.eq(TestSchema.typename);
  });

  test('dynamic schema definitions with references', async () => {
    const orgSchema = createStoredSchema({
      typename: 'example.com/type/Org',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.String,
        }).annotations({
          [AST.DescriptionAnnotationId]: 'Org name',
        }),
      ),
    });

    const personSchema = createStoredSchema({
      typename: 'example.com/type/Person',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.String,
          email: S.String,
          org: createReferenceAnnotation(orgSchema).annotations({
            [AST.DescriptionAnnotationId]: 'Employer',
          }),
        }),
      ),
    });

    const personView = createView({ typename: personSchema.typename, jsonSchema: personSchema.jsonSchema });
    log('schema', { org: orgSchema, person: personSchema });
    log('view', { person: personView });
  });
});
