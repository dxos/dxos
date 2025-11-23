//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, assert, beforeEach, describe, test } from 'vitest';

import { Filter, Format, Obj, Query, Ref, Type } from '@dxos/echo';
import { RuntimeSchemaRegistry, StoredSchema, TypeEnum } from '@dxos/echo/internal';
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
    const schema = Testing.Person;
    const jsonSchema = Type.toJsonSchema(schema);
    const registry = new RuntimeSchemaRegistry();
    registry.addSchema([Testing.Person, Testing.Organization]);

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
    expect(visibleFields.map((f) => f.path)).to.deep.eq(['name', 'image', 'email', 'organization']);

    const projection = new ProjectionModel(jsonSchema, view.projection);

    {
      const { props } = projection.getFieldProjection(projection.getFieldId('name')!);
      expect(props).to.deep.eq({
        property: 'name',
        type: TypeEnum.String,
        format: Format.TypeFormat.String,
      });
    }

    {
      const { props } = projection.getFieldProjection(projection.getFieldId('organization')!);
      expect(props).to.deep.eq({
        property: 'organization',
        type: TypeEnum.Ref,
        format: Format.TypeFormat.Ref,
        referencePath: 'name',
        referenceSchema: 'example.com/type/Organization',
      });
    }
  });

  test('static schema definitions with references', async ({ expect }) => {
    const organization = Obj.make(Testing.Organization, {
      name: 'DXOS',
      website: 'https://dxos.org',
    });
    const contact = Obj.make(Testing.Person, {
      name: 'Alice',
      organization: Ref.make(organization),
    });
    log('schema', {
      organization: Type.toJsonSchema(Testing.Organization),
      contact: Type.toJsonSchema(Testing.Person),
    });
    log('objects', { organization, contact });
    expect(Obj.getTypename(organization)).to.eq(Testing.Organization.typename);
    expect(Obj.getTypename(contact)).to.eq(Testing.Person.typename);
  });

  test('maintains field order during initialization', async ({ expect }) => {
    const schema = Obj.make(StoredSchema, {
      typename: 'example.com/type/Person',
      version: '0.1.0',
      jsonSchema: Type.toJsonSchema(
        Schema.Struct({
          name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
          email: Schema.optional(Format.Email),
          salary: Schema.optional(Format.Currency({ code: 'usd', decimals: 2 })),
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
