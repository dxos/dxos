//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { MutableSchemaRegistry } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  Format,
  FormatEnum,
  type JsonProp,
  TypeEnum,
  TypedObject,
  createStoredSchema,
  ref,
  toJsonSchema,
} from '@dxos/echo-schema';

import { ViewProjection } from './projection';
import { createView } from './view';

describe('ViewProjection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('gets and updates projection', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);

    const schema = createStoredSchema({
      typename: 'example.com/type/Person',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }),
          email: Format.Email,
          salary: Format.Currency({ code: 'usd', decimals: 2 }),
        }),
      ),
    });

    const mutable = registry.registerSchema(db.add(schema));

    const view = createView({ typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);
    expect(view.fields).to.have.length(3);

    {
      const { props } = projection.getFieldProjection('name' as JsonProp);
      expect(props).to.deep.eq({
        property: 'name',
        type: TypeEnum.String,
        format: FormatEnum.String,
        title: 'Name',
      });
    }

    {
      const { props } = projection.getFieldProjection('email' as JsonProp);
      expect(props).to.include({
        property: 'email',
        type: TypeEnum.String,
        format: FormatEnum.Email,
      });
    }

    projection.setFieldProjection({
      field: {
        property: 'email' as JsonProp,
        size: 100,
      },
    });

    {
      const { field, props } = projection.getFieldProjection('email' as JsonProp);
      expect(field).to.include({
        property: 'email',
        size: 100,
      });
      expect(props).to.include({
        property: 'email',
        type: TypeEnum.String,
        format: FormatEnum.Email,
      });

      projection.setFieldProjection({ props });
    }

    {
      const { props } = projection.getFieldProjection('salary' as JsonProp);
      expect(props).to.include({
        property: 'salary',
        type: TypeEnum.Number,
        format: FormatEnum.Currency,
        currency: 'USD',
        multipleOf: 2,
      });

      props.currency = 'GBP';
      projection.setFieldProjection({ props });
    }

    {
      const { props } = projection.getFieldProjection('salary' as JsonProp);
      expect(props).to.include({
        property: 'salary',
        type: TypeEnum.Number,
        format: FormatEnum.Currency,
        currency: 'GBP',
        multipleOf: 2,
      });
    }
  });

  test('gets and updates references', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);

    // TODO(burdon): Reconcile with createStoredSchema.
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      name: S.String,
    }) {}

    const schema = createStoredSchema({
      typename: 'example.com/type/Person',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }),
          email: Format.Email,
          salary: Format.Currency({ code: 'usd', decimals: 2 }),
          org: ref(Org),
        }),
      ),
    });

    const mutable = registry.registerSchema(db.add(schema));
    const view = createView({ typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);

    projection.setFieldProjection({
      field: {
        property: 'org' as JsonProp,
        referenceProperty: 'name' as JsonProp,
      },
    });

    const { field, props } = projection.getFieldProjection('org' as JsonProp);
    expect(field).to.deep.eq({
      property: 'org',
      referenceProperty: 'name',
    });
    expect(props).to.deep.eq({
      property: 'org',
      type: TypeEnum.Ref,
      format: FormatEnum.Ref,
      referenceSchema: 'dxn:type:example.com/type/Org',
    });
  });

  test('deletes field projections', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);

    const schema = createStoredSchema({
      typename: 'example.com/type/Person',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }),
          email: Format.Email,
        }),
      ),
    });

    const mutable = registry.registerSchema(db.add(schema));
    const view = createView({ typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);

    // Initial state
    expect(view.fields).to.have.length(2);
    expect(mutable.jsonSchema.properties?.email).to.exist;

    // Delete and verify
    const { deleted, index } = projection.deleteFieldProjection('email');
    expect(view.fields).to.have.length(1);
    expect(mutable.jsonSchema.properties?.email).to.not.exist;
    expect(deleted.field.property).to.equal('email');
    expect(deleted.props.format).to.equal(FormatEnum.Email);
    expect(index).to.equal(0);
  });

  test('field projection delete and restore', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);

    const schema = createStoredSchema({
      typename: 'example.com/type/Person',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.optional(S.Number),
          email: S.optional(S.Number),
          description: S.optional(S.String),
        }),
      ),
    });

    const mutable = registry.registerSchema(db.add(schema));
    const view = createView({
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
    });
    const projection = new ViewProjection(mutable, view);

    // Capture initial states
    const initialFieldsOrder = view.fields.map((f) => f.property);
    const emailIndex = initialFieldsOrder.indexOf('email' as JsonProp);
    const initialEmail = projection.getFieldProjection('email' as JsonProp);
    const initialSchemaProps = { ...mutable.jsonSchema.properties! };

    // Delete and restore
    const { deleted, index } = projection.deleteFieldProjection('email');

    console.log('deleted', deleted);

    // Verify email is deleted but name is unchanged
    expect(mutable.jsonSchema.properties!.email).to.be.undefined;
    expect(mutable.jsonSchema.properties!.name).to.deep.equal(initialSchemaProps.name);

    projection.setFieldProjection(deleted, index);

    // Verify field position is restored
    const restoredFieldsOrder = view.fields.map((f) => f.property);
    expect(restoredFieldsOrder.indexOf('email' as JsonProp)).to.equal(emailIndex);

    // Verify projection data matches
    const restored = projection.getFieldProjection('email' as JsonProp);
    expect(restored).to.deep.equal(initialEmail);

    // Verify all schema properties match initial state
    expect(mutable.jsonSchema.properties).to.deep.equal(initialSchemaProps);
  });

  // TODO(burdon): Test switching format.
});
