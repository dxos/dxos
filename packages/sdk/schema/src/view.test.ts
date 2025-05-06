//
// Copyright 2024 DXOS.org
//

import { SchemaAST as AST, Schema as S, pipe } from 'effect';
import { capitalize } from 'effect/String';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Format, getTypename, toJsonSchema, Ref } from '@dxos/echo-schema';
import { live, createStoredSchema } from '@dxos/live-object';
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
    const schema = Testing.Contact;
    const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: toJsonSchema(schema) });
    expect(view.query.typename).to.eq(schema.typename);
    expect(view.fields.map((f) => f.path)).to.deep.eq([
      'name',
      'image',
      'email',
      // 'address',
      'organization',
    ]);

    const props = getSchemaProperties(schema.ast);
    const labels = props.map((p) => pipe(p.name ?? p.title, capitalize));
    expect(labels).to.deep.eq([
      'Name',
      'Image',
      'Email',
      // 'Address',
      'Organization',
    ]);
  });

  test('static schema definitions with references', async ({ expect }) => {
    const organization = live(Testing.Organization, { name: 'DXOS', website: 'https://dxos.org' });
    const contact = live(Testing.Contact, {
      name: 'Alice',
      email: 'alice@example.com',
      organization: Ref(organization),
    });
    log('schema', { organization: toJsonSchema(Testing.Organization), contact: toJsonSchema(Testing.Contact) });
    log('objects', { organization, contact });
    expect(getTypename(organization)).to.eq(Testing.Organization.typename);
    expect(getTypename(contact)).to.eq(Testing.Contact.typename);
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
