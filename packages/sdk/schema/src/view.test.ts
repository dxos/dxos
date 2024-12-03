//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { pipe } from 'effect';
import { capitalize } from 'effect/String';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { create, createStoredSchema, Format, getTypename, toJsonSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { getSchemaProperties } from './properties';
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

  test('create view from TypedObject', async ({ expect }) => {
    const schema = Test.ContactType;
    const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: toJsonSchema(schema) });
    expect(view.query.typename).to.eq(schema.typename);
    expect(view.fields.map((f) => f.path)).to.deep.eq([
      'name',
      'email',
      // 'address',
      'employer',
    ]);

    const props = getSchemaProperties(schema.ast);
    const labels = props.map((p) => pipe(p.title ?? p.name, capitalize));
    expect(labels).to.deep.eq([
      'Name',
      'Email',
      // 'Address',
      'Employer',
    ]);
  });

  test('static schema definitions with references', async ({ expect }) => {
    const org = create(Test.OrgType, { name: 'Org' });
    const contact = create(Test.ContactType, { name: 'Alice', email: 'alice@example.com', employer: org });
    log('schema', { org: toJsonSchema(Test.OrgType), person: toJsonSchema(Test.ContactType) });
    log('objects', { org, person: contact });
    expect(getTypename(org)).to.eq(Test.OrgType.typename);
    expect(getTypename(contact)).to.eq(Test.ContactType.typename);
  });

  test('maintains field order during initialization', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    // const registry = new MutableSchemaRegistry(db);

    const schema = createStoredSchema({
      typename: 'example.com/type/Contact',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.optional(S.String).annotations({ [AST.TitleAnnotationId]: 'Name' }),
          email: S.optional(Format.Email),
          salary: S.optional(Format.Currency({ code: 'usd', decimals: 2 })),
        }),
      ),
    });

    // const _mutable = registry.registerSchema(db.add(schema));
    const view = createView({
      name: 'Test',
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
      fields: ['name', 'email', 'salary'], // Explicitly define order
    });

    // Verify initial field order.
    const fieldOrder = view.fields.map((f) => f.path);
    expect(fieldOrder).to.deep.equal(['name', 'email', 'salary']);
  });
});
