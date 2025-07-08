//
// Copyright 2024 DXOS.org
//

import { Schema, String, pipe } from 'effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Type, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { StoredSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { createProjection } from './projection';
import { HasView } from '../common';
import { getSchemaProperties } from '../properties';
import { Testing } from '../testing';

describe('Projection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('create view from TypedObject', async ({ expect }) => {
    const schema = Testing.Contact;
    const view = createProjection({ name: 'Test', typename: schema.typename, jsonSchema: Type.toJsonSchema(schema) });
    expect(view.query.typename).to.eq(schema.typename);
    expect(view.fields.map((f) => f.path)).to.deep.eq([
      'name',
      'image',
      'email',
      // 'address',
      'organization',
    ]);

    const props = getSchemaProperties(schema.ast);
    const labels = props.map((p) => pipe(p.name ?? p.title, String.capitalize));
    expect(labels).to.deep.eq([
      'Name',
      'Image',
      'Email',
      // 'Address',
      'Organization',
    ]);
  });

  test('static schema definitions with references', async ({ expect }) => {
    const organization = Obj.make(Testing.Organization, { name: 'DXOS', website: 'https://dxos.org' });
    const contact = Obj.make(Testing.Contact, {
      name: 'Alice',
      email: 'alice@example.com',
      organization: Ref.make(organization),
    });
    log('schema', {
      organization: Type.toJsonSchema(Testing.Organization),
      contact: Type.toJsonSchema(Testing.Contact),
    });
    log('objects', { organization, contact });
    expect(Obj.getTypename(organization)).to.eq(Testing.Organization.typename);
    expect(Obj.getTypename(contact)).to.eq(Testing.Contact.typename);
  });

  test('maintains field order during initialization', async ({ expect }) => {
    const schema = Obj.make(StoredSchema, {
      typename: 'example.com/type/Contact',
      version: '0.1.0',
      jsonSchema: Type.toJsonSchema(
        Schema.Struct({
          name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
          email: Schema.optional(Type.Format.Email),
          salary: Schema.optional(Type.Format.Currency({ code: 'usd', decimals: 2 })),
        }),
      ),
    });

    const view = createProjection({
      name: 'Test',
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
      fields: ['name', 'email', 'salary'], // Explicitly define order.
    });

    // Verify initial field order.
    const fieldOrder = view.fields.map((f) => f.path);
    expect(fieldOrder).to.deep.equal(['name', 'email', 'salary']);
  });

  // TODO(burdon): Should Composer support both immutable types (Organization, Contact) or require that they be cloned and stored as StoredSchema?
  test('Create views', ({ expect }) => {
    const schema = Obj.make(StoredSchema, {
      typename: 'example.com/type/Contact',
      version: '0.1.0',
      jsonSchema: Type.toJsonSchema(
        Schema.Struct({
          name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
          email: Schema.optional(Type.Format.Email),
          salary: Schema.optional(Type.Format.Currency({ code: 'usd', decimals: 2 })),
        }),
      ),
    });

    const projection = createProjection({
      name: 'Test',
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
      fields: ['name', 'email', 'salary'],
    });

    const view = Obj.make(Type.Expando, {});

    const relation = Relation.make(HasView, {
      [Relation.Source]: schema,
      [Relation.Target]: view,
      projection: Ref.make(projection),
    });

    // TODO(burdon): Query for StoredObjects and Relations.
    expect(relation).to.exist;
  });
});
