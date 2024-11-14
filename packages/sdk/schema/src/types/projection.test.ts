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
  type JsonPath,
  type JsonProp,
  TypeEnum,
  TypedObject,
  createStoredSchema,
  ref,
  toJsonSchema,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { ViewProjection } from './projection';
import { createView, type ViewType } from './view';

const getFieldId = (view: ViewType, path: string): string => {
  const field = view.fields.find((field) => field.path === path);
  invariant(field);
  return field.id;
};

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

    const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);
    expect(view.fields).to.have.length(3);

    {
      const { props } = projection.getFieldProjection(getFieldId(view, 'name'));
      expect(props).to.deep.eq({
        property: 'name',
        type: TypeEnum.String,
        format: FormatEnum.String,
        title: 'Name',
      });
    }

    {
      const { props } = projection.getFieldProjection(getFieldId(view, 'email'));
      expect(props).to.include({
        property: 'email',
        type: TypeEnum.String,
        format: FormatEnum.Email,
      });
    }

    projection.setFieldProjection({
      field: {
        id: getFieldId(view, 'email'),
        path: 'email' as JsonPath,
        size: 100,
      },
    });

    {
      const { field, props } = projection.getFieldProjection(getFieldId(view, 'email'));
      expect(field).to.include({
        path: 'email',
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
      const { props } = projection.getFieldProjection(getFieldId(view, 'salary'));
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
      const { props } = projection.getFieldProjection(getFieldId(view, 'salary'));
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
    const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);

    projection.setFieldProjection({
      field: {
        id: getFieldId(view, 'org'),
        path: 'org' as JsonPath,
        referencePath: 'name' as JsonPath,
      },
    });

    const { field, props } = projection.getFieldProjection(getFieldId(view, 'org'));

    expect(field).to.deep.eq({
      id: getFieldId(view, 'org'),
      path: 'org',
      referencePath: 'name',
    });

    expect(props).to.deep.eq({
      property: 'org',
      type: TypeEnum.Ref,
      format: FormatEnum.Ref,
      referenceSchema: 'example.com/type/Org',
      referencePath: 'name',
    });

    // Note: `referencePath` is stripped from schema.
    expect(schema.jsonSchema.properties?.['org' as const]).to.deep.eq({
      $id: '/schemas/echo/ref',
      reference: {
        schema: {
          $ref: 'dxn:type:example.com/type/Org',
        },
        schemaVersion: '0.1.0',
      },
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
    const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);

    // Initial state.
    expect(view.fields).to.have.length(2);
    expect(mutable.jsonSchema.properties?.['email' as const]).to.exist;

    // Delete and verify.
    const { deleted, index } = projection.deleteFieldProjection(getFieldId(view, 'email'));
    expect(view.fields).to.have.length(1);
    expect(mutable.jsonSchema.properties?.['email' as const]).to.not.exist;
    expect(deleted.field.path).to.equal('email');
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
    const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);

    // Capture initial states.
    const initialFieldsOrder = view.fields.map((f) => f.path);
    const emailIndex = initialFieldsOrder.indexOf('email' as JsonPath);
    const initialEmail = projection.getFieldProjection(getFieldId(view, 'email'));
    const initialSchemaProps = { ...mutable.jsonSchema.properties! };

    // Delete and restore.
    const { deleted, index } = projection.deleteFieldProjection(getFieldId(view, 'email'));

    // Verify email is deleted but name is unchanged.
    expect(mutable.jsonSchema.properties!.email).to.be.undefined;
    expect(mutable.jsonSchema.properties!.name).to.deep.equal(initialSchemaProps.name);

    projection.setFieldProjection(deleted, index);

    // Verify field position is restored.
    const restoredFieldsOrder = view.fields.map((f) => f.path);
    expect(restoredFieldsOrder.indexOf('email' as JsonPath)).to.equal(emailIndex);

    // Verify projection data matches.
    const restored = projection.getFieldProjection(getFieldId(view, 'email'));
    expect(restored).to.deep.equal(initialEmail);

    // Verify all schema properties match initial state.
    expect(mutable.jsonSchema.properties).to.deep.equal(initialSchemaProps);
  });

  test('property rename', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);

    const schema = createStoredSchema({
      typename: 'example.com/type/Person',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.String,
          email: Format.Email,
        }),
      ),
    });

    const mutable = registry.registerSchema(db.add(schema));
    const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);

    // Capture initial state.
    const initialFieldsOrder = view.fields.map((f) => f.path);
    const emailIndex = initialFieldsOrder.indexOf('email' as JsonProp);
    const { field, props } = projection.getFieldProjection(getFieldId(view, 'email'));

    // Perform rename.
    projection.setFieldProjection({
      field,
      props: { ...props, property: 'primaryEmail' as JsonProp },
    });

    // Verify field order is preserved.
    const updatedFieldsOrder = view.fields.map((f) => f.path);
    expect(updatedFieldsOrder.length).to.equal(initialFieldsOrder.length);
    expect(updatedFieldsOrder[emailIndex]).to.equal('primaryEmail');

    // Verify the renamed field preserved all properties.
    const renamed = projection.getFieldProjection(getFieldId(view, 'primaryEmail'));
    expect(renamed.props).to.deep.equal({
      ...props,
      property: 'primaryEmail',
    });

    // Verify old field is completely removed.
    expect(view.fields.find((f) => f.path === 'email')).to.be.undefined;
    expect(mutable.jsonSchema.properties?.['email' as const]).to.be.undefined;
  });

  // TODO(burdon): Test changing format.
});
