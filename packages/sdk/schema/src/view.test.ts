//
// Copyright 2024 DXOS.org
//

import { Schema, String, pipe } from 'effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Type, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { create, getTypename, RelationSourceId, RelationTargetId, StoredSchema, toJsonSchema } from '@dxos/echo-schema';
import { live } from '@dxos/live-object';
import { log } from '@dxos/log';

import { getSchemaProperties } from './properties';
import { Testing } from './testing';
import { createView, HasView, type ViewType } from './view';

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
    const organization = live(Testing.Organization, { name: 'DXOS', website: 'https://dxos.org' });
    const contact = live(Testing.Contact, {
      name: 'Alice',
      email: 'alice@example.com',
      organization: Ref.make(organization),
    });
    log('schema', { organization: toJsonSchema(Testing.Organization), contact: toJsonSchema(Testing.Contact) });
    log('objects', { organization, contact });
    expect(getTypename(organization)).to.eq(Testing.Organization.typename);
    expect(getTypename(contact)).to.eq(Testing.Contact.typename);
  });

  test('maintains field order during initialization', async ({ expect }) => {
    const schema = create(StoredSchema, {
      typename: 'example.com/type/Contact',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        Schema.Struct({
          name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
          email: Schema.optional(Type.Format.Email),
          salary: Schema.optional(Type.Format.Currency({ code: 'usd', decimals: 2 })),
        }),
      ),
    });

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

  // TODO(burdon): Should Composer support both immutable types (Organization, Contact) or require that they be cloned and stored as StoredSchema?
  test('Create views', ({ expect }) => {
    const schema: StoredSchema = create(StoredSchema, {
      typename: 'example.com/type/Contact',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        Schema.Struct({
          name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
          email: Schema.optional(Type.Format.Email),
          salary: Schema.optional(Type.Format.Currency({ code: 'usd', decimals: 2 })),
        }),
      ),
    });

    const view: ViewType = createView({
      name: 'Test',
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
      fields: ['name', 'email', 'salary'],
    });

    // TODO(burdon): Relation.Source doesn't work.
    const relation = Relation.make(HasView, {
      [RelationSourceId]: schema,
      [RelationTargetId]: view,
    });

    expect(relation).to.exist;
  });
});
