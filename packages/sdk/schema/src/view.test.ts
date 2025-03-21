//
// Copyright 2024 DXOS.org
//

import { SchemaAST as AST, Schema as S, pipe } from 'effect';
import { capitalize } from 'effect/String';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Format, getTypename, toJsonSchema } from '@dxos/echo-schema';
import { create, createStoredSchema, makeRef } from '@dxos/live-object';
import { log } from '@dxos/log';

import { getSchemaProperties } from './properties';
import { Testing } from './testing';
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
    const schema = Testing.ContactType;
    const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: toJsonSchema(schema) });
    expect(view.query.typename).to.eq(schema.typename);
    expect(view.fields.map((f) => f.path)).to.deep.eq([
      'name',
      'email',
      // 'address',
      'employer',
    ]);

    const props = getSchemaProperties(schema.ast);
    const labels = props.map((p) => pipe(p.name ?? p.title, capitalize));
    expect(labels).to.deep.eq([
      'Name',
      'Email',
      // 'Address',
      'Employer',
    ]);
  });

  test('static schema definitions with references', async ({ expect }) => {
    const org = create(Testing.OrgType, { name: 'DXOS', website: 'https://dxos.org' });
    const contact = create(Testing.ContactType, { name: 'Alice', email: 'alice@example.com', employer: makeRef(org) });
    log('schema', { org: toJsonSchema(Testing.OrgType), person: toJsonSchema(Testing.ContactType) });
    log('objects', { org, person: contact });
    expect(getTypename(org)).to.eq(Testing.OrgType.typename);
    expect(getTypename(contact)).to.eq(Testing.ContactType.typename);
  });

  test('maintains field order during initialization', async ({ expect }) => {
    const schema = createStoredSchema(
      {
        typename: 'example.com/type/Contact',
        version: '0.1.0',
      },
      toJsonSchema(
        S.Struct({
          name: S.optional(S.String).annotations({ [AST.TitleAnnotationId]: 'Name' }),
          email: S.optional(Format.Email),
          salary: S.optional(Format.Currency({ code: 'usd', decimals: 2 })),
        }),
      ),
    );

    const view = createView({
      name: 'Test',
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
      fields: ['name', 'email', 'salary'], // Explicitly define order.
    });

    // Verify initial field order.
    const fieldOrder = view.fields.map((f) => f.path);
    expect(fieldOrder).to.deep.equal(['name', 'email', 'salary']);
  });
});
