//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { afterEach, assert, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { StoredSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { DataType } from '../common';

import { createView, createViewWithReferences } from './view';

describe('Projection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test.only('create view from schema', async ({ expect }) => {
    const schema = DataType.Person;
    const presentation = Obj.make(Type.Expando, {});
    const view = await createViewWithReferences({
      query: Query.select(Filter.type(schema)),
      jsonSchema: Type.toJsonSchema(schema),
      presentation,
    });
    assert(view.query.type === 'select');
    assert(view.query.filter.type === 'object');
    expect(view.query.filter.typename).to.eq(Type.getDXN(schema)?.toString());
    const visibleFields = view.projection.fields.filter((f) => f.visible);
    expect(visibleFields.map((f) => f.path)).to.deep.eq([
      'fullName',
      'preferredName',
      'nickname',
      'image',
      'organization',
      'jobTitle',
      'department',
      'notes',
      'birthday',
    ]);

    // const props = getSchemaProperties(schema.ast);
    // const labels = props.map((p) => pipe(p.name ?? p.title, String.capitalize));
    // expect(labels).to.deep.eq([
    //   'Full Name',
    //   'Preferred Name',
    //   'Nickname',
    //   'Image',
    //   'Organization',
    //   'Job Title',
    //   'Department',
    //   'Notes',
    //   'Emails',
    //   'Identities',
    //   'Phone Numbers',
    //   'Addresses',
    //   'Urls',
    //   'Birthday',
    //   'Fields',
    // ]);
  });

  test('static schema definitions with references', async ({ expect }) => {
    const organization = Obj.make(DataType.Organization, { name: 'DXOS', website: 'https://dxos.org' });
    const contact = Obj.make(DataType.Person, {
      fullName: 'Alice',
      emails: [{ value: 'alice@example.com' }],
      organization: Ref.make(organization),
    });
    log('schema', {
      organization: Type.toJsonSchema(DataType.Organization),
      contact: Type.toJsonSchema(DataType.Person),
    });
    log('objects', { organization, contact });
    expect(Obj.getTypename(organization)).to.eq(DataType.Organization.typename);
    expect(Obj.getTypename(contact)).to.eq(DataType.Person.typename);
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

    const presentation = Obj.make(Type.Expando, {});
    const view = createView({
      query: Query.select(Filter.typename(schema.typename)),
      jsonSchema: schema.jsonSchema,
      presentation,
      fields: ['name', 'email', 'salary'], // Explicitly define order.
    });

    // Verify initial field order.
    const fieldOrder = view.projection.fields.map((f) => f.path);
    expect(fieldOrder).to.deep.equal(['name', 'email', 'salary']);
  });
});
