//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { FormatAnnotationId, FormatEnum, TypedObject, create, getTypename, ref, toJsonSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { Test } from './testing';
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
    const schema = Test.ContactType;
    const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: toJsonSchema(schema) });
    expect(view.query.typename).to.eq(schema.typename);
    expect(view.fields.map((f) => f.path)).to.deep.eq(['name', 'email', 'employer']);
  });
});
