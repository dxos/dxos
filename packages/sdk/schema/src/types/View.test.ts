//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, assert, beforeEach, describe, test } from 'vitest';

import { Filter, JsonSchema, Obj, Query, Ref, Type } from '@dxos/echo';
import { RuntimeSchemaRegistry } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Format, TypeEnum } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { ProjectionModel, createDirectChangeCallback } from '@dxos/schema';

import { TestSchema } from '../testing';
import { ViewModel } from '../types';

describe('Projection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('create view from schema', async ({ expect }) => {
    const schema = TestSchema.Person;
    const jsonSchema = JsonSchema.toJsonSchema(schema);
    const registry = new RuntimeSchemaRegistry();
    await registry.register([TestSchema.Person, TestSchema.Organization]);

    const view = await ViewModel.makeWithReferences({
      query: Query.select(Filter.type(schema)),
      jsonSchema,
      registry,
    });
    assert(view.query.ast.type === 'select');
    assert(view.query.ast.filter.type === 'object');
    expect(view.query.ast.filter.typename).to.eq(Type.getDXN(schema)?.toString());
    const visibleFields = view.projection.fields.filter((f) => f.visible);
    expect(visibleFields.map((f) => f.path)).to.deep.eq(['name', 'image', 'email', 'organization']);

    const projection = new ProjectionModel({
      view,
      baseSchema: jsonSchema,
      change: createDirectChangeCallback(view.projection, jsonSchema),
    });

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
        referenceSchema: 'com.example.type.organization',
      });
    }
  });

  test('static schema definitions with references', async ({ expect }) => {
    const organization = Obj.make(TestSchema.Organization, {
      name: 'DXOS',
      website: 'https://dxos.org',
    });
    const contact = Obj.make(TestSchema.Person, {
      name: 'Alice',
      organization: Ref.make(organization),
    });
    log('schema', {
      organization: JsonSchema.toJsonSchema(TestSchema.Organization),
      contact: JsonSchema.toJsonSchema(TestSchema.Person),
    });
    log('objects', { organization, contact });
    expect(Obj.getTypename(organization)).to.eq(TestSchema.Organization.typename);
    expect(Obj.getTypename(contact)).to.eq(TestSchema.Person.typename);
  });

  test('maintains field order during initialization', async ({ expect }) => {
    const schema = Obj.make(Type.PersistentType, {
      typename: 'com.example.type.person',
      version: '0.1.0',
      jsonSchema: JsonSchema.toJsonSchema(
        Schema.Struct({
          name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
          email: Schema.optional(Format.Email),
          salary: Schema.optional(Format.Currency({ code: 'usd', decimals: 2 })),
        }),
      ),
    });

    const view = ViewModel.make({
      query: Query.select(Filter.typename(schema.typename)),
      jsonSchema: schema.jsonSchema,
      fields: ['name', 'email', 'salary'], // Explicitly define order.
    });

    // Verify initial field order.
    const fieldOrder = view.projection.fields.map((f) => f.path);
    expect(fieldOrder).to.deep.equal(['name', 'email', 'salary']);
  });
});
