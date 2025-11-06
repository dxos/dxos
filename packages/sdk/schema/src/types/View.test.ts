//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, assert, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { FormatEnum, RuntimeSchemaRegistry, StoredSchema, TypeEnum } from '@dxos/echo/internal';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { log } from '@dxos/log';
import { ProjectionModel } from '@dxos/schema';

import { Testing } from '../testing';

import * as View from './View';

describe('Projection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('create view from schema', async ({ expect }) => {
    const schema = Testing.Contact;
    const jsonSchema = Type.toJsonSchema(schema);

    const registry = new RuntimeSchemaRegistry();
    registry.addSchema([Testing.Contact, Testing.Organization]);

    const view = await View.makeWithReferences({
      query: Query.select(Filter.type(schema)),
      jsonSchema,
      presentation: Obj.make(Type.Expando, {}),
      registry,
    });
    assert(view.query.ast.type === 'select');
    assert(view.query.ast.filter.type === 'object');
    expect(view.query.ast.filter.typename).to.eq(Type.getDXN(schema)?.toString());
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
      'location',
    ]);

    const projection = new ProjectionModel(jsonSchema, view.projection);

    {
      const { props } = projection.getFieldProjection(projection.getFieldId('fullName')!);
      expect(props).to.deep.eq({
        property: 'fullName',
        title: 'Full Name',
        type: TypeEnum.String,
        format: FormatEnum.String,
      });
    }

    {
      const { props } = projection.getFieldProjection(projection.getFieldId('organization')!);
      expect(props).to.deep.eq({
        property: 'organization',
        title: 'Organization',
        description: 'The organization the person is currently employed by.',
        type: TypeEnum.Ref,
        format: FormatEnum.Ref,
        referencePath: 'name',
        referenceSchema: 'dxos.org/type/Organization',
      });
    }
  });

  test('static schema definitions with references', async ({ expect }) => {
    const organization = Obj.make(Testing.Organization, {
      name: 'DXOS',
      website: 'https://dxos.org',
    });
    const contact = Obj.make(Testing.Contact, {
      name: 'Alice',
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

    const presentation = Obj.make(Type.Expando, {});
    const view = View.make({
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
