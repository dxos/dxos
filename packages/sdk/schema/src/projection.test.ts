//
// Copyright 2024 DXOS.org
//

import { SchemaAST as AST, Schema as S } from 'effect';
import { getPropertySignatures } from 'effect/SchemaAST';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoSchemaRegistry } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  Format,
  FormatEnum,
  ObjectAnnotationId,
  TypeEnum,
  TypedObject,
  Ref,
  type JsonPath,
  type JsonProp,
  EntityKind,
  getPropertyMetaAnnotation,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { getSnapshot } from '@dxos/live-object';

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
    const registry = new EchoSchemaRegistry(db);

    const schema = S.Struct({
      name: S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }),
      email: Format.Email,
      salary: Format.Currency({ code: 'usd', decimals: 2 }),
    }).annotations({
      [ObjectAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });
    const [mutable] = await registry.register([schema]);

    const view = createView({ name: 'Test', typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const projection = new ViewProjection(mutable, view);
    expect(view.fields).to.have.length(3);

    {
      const { props } = projection.getFieldProjection(getFieldId(view, 'name'));
      expect(props).to.deep.eq({
        property: 'name',
        description: 'a string',
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
    const registry = new EchoSchemaRegistry(db);

    // TODO(burdon): Reconcile with createStoredSchema.
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      name: S.String,
    }) {}

    const schema = S.Struct({
      name: S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }),
      email: Format.Email,
      salary: Format.Currency({ code: 'usd', decimals: 2 }),
      org: Ref(Org),
    }).annotations({
      [ObjectAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const view = createView({ name: 'Test', typename: mutable.typename, jsonSchema: mutable.jsonSchema });
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
    expect(mutable.jsonSchema.properties?.['org' as const]).to.deep.eq({
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
    const registry = new EchoSchemaRegistry(db);

    const schema = S.Struct({
      name: S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }),
      email: Format.Email,
    }).annotations({
      [ObjectAnnotationId]: {
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const view = createView({ name: 'Test', typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const projection = new ViewProjection(mutable, view);

    // Initial state.
    expect(view.fields).to.have.length(2);
    expect(mutable.jsonSchema.properties?.['email' as const]).to.exist;

    // Delete and verify.
    const { deleted } = projection.deleteFieldProjection(getFieldId(view, 'email'));
    expect(view.fields).to.have.length(1);
    expect(mutable.jsonSchema.properties?.['email' as const]).to.not.exist;
    expect(deleted.field.path).to.equal('email');
    expect(deleted.props.format).to.equal(FormatEnum.Email);
  });

  test('field projection delete and restore', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = S.Struct({
      name: S.optional(S.Number),
      email: S.optional(S.Number),
      description: S.optional(S.String),
    }).annotations({
      [ObjectAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const view = createView({ name: 'Test', typename: mutable.typename, jsonSchema: mutable.jsonSchema });
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
    const registry = new EchoSchemaRegistry(db);

    const schema = S.Struct({
      name: S.String,
      email: Format.Email,
    }).annotations({
      [ObjectAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const view = createView({ name: 'Test', typename: mutable.typename, jsonSchema: mutable.jsonSchema });
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

  test('single select format', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = S.Struct({
      status: S.String,
    }).annotations({
      [ObjectAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Task',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const view = createView({ name: 'Test', typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const projection = new ViewProjection(mutable, view);
    const fieldId = projection.getFieldId('status');
    invariant(fieldId);

    // Set single select format with options.
    projection.setFieldProjection({
      field: { id: fieldId, path: 'status' as JsonPath },
      props: {
        property: 'status' as JsonProp,
        type: TypeEnum.String,
        format: FormatEnum.SingleSelect,
        options: [
          { id: 'draft', title: 'Draft', color: 'gray' },
          { id: 'published', title: 'Published', color: 'green' },
        ],
      },
    });

    // Verify JSON Schema.
    expect(mutable.jsonSchema.properties?.status).to.deep.include({
      type: 'string',
      format: 'single-select',
      enum: ['draft', 'published'],
      echo: {
        annotations: {
          singleSelect: {
            options: [
              { id: 'draft', title: 'Draft', color: 'gray' },
              { id: 'published', title: 'Published', color: 'green' },
            ],
          },
        },
      },
    });

    // Verify projection.
    const { props } = projection.getFieldProjection(fieldId);

    expect(props.format).to.equal(FormatEnum.SingleSelect);
    expect(props.options).to.deep.equal([
      { id: 'draft', title: 'Draft', color: 'gray' },
      { id: 'published', title: 'Published', color: 'green' },
    ]);

    // Update options.
    projection.setFieldProjection({
      field: { id: fieldId, path: 'status' as JsonPath },
      props: {
        ...props,
        options: [
          { id: 'draft', title: 'Draft', color: 'indigo' },
          { id: 'published', title: 'Published', color: 'blue' },
          { id: 'archived', title: 'Archived', color: 'amber' },
        ],
      },
    });

    // Verify updated JSON Schema.
    expect(mutable.jsonSchema.properties?.status?.echo).to.deep.include({
      annotations: {
        singleSelect: {
          options: [
            { id: 'draft', title: 'Draft', color: 'indigo' },
            { id: 'published', title: 'Published', color: 'blue' },
            { id: 'archived', title: 'Archived', color: 'amber' },
          ],
        },
      },
    });

    const effectSchema = mutable.getSchemaSnapshot();

    expect(() => S.validateSync(effectSchema)({ status: 'draft' })).not.to.throw();
    expect(() => S.validateSync(effectSchema)({ status: 'published' })).not.to.throw();
    expect(() => S.validateSync(effectSchema)({ status: 'archived' })).not.to.throw();
    expect(() => S.validateSync(effectSchema)({ status: 'invalid-status' })).to.throw();

    const properties = getPropertySignatures(effectSchema.ast);
    const statusProperty = properties.find((p) => p.name === 'status');
    invariant(statusProperty);
    const statusPropertyMeta = getPropertyMetaAnnotation(statusProperty, 'singleSelect');

    // Ensure that the materialized schema contains option annotations.
    expect(statusPropertyMeta).to.deep.equal({
      options: [
        { id: 'draft', title: 'Draft', color: 'indigo' },
        { id: 'published', title: 'Published', color: 'blue' },
        { id: 'archived', title: 'Archived', color: 'amber' },
      ],
    });
  });

  // TODO(burdon): Test changing format.

  test('hidden fields are tracked in hiddenFields', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = S.Struct({
      name: S.String,
      email: Format.Email,
      createdAt: S.String,
    }).annotations({
      [ObjectAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);

    // Create view with only name and email fields.
    const view = createView({
      name: 'Test',
      typename: mutable.typename,
      jsonSchema: mutable.jsonSchema,
      fields: [
        'name',
        'email',
        // createdAt intentionally omitted.
      ],
    });

    const projection = new ViewProjection(mutable, view);
    const initialSchema = mutable.getSchemaSnapshot();

    // Verify only the included fields are in the view.
    expect(view.fields).to.have.length(2);
    expect(view.fields.map((f) => f.path)).to.deep.equal(['name', 'email']);

    // Verify we can get projections for visible fields.
    expect(projection.getFieldProjection(getFieldId(view, 'name'))).to.exist;
    expect(projection.getFieldProjection(getFieldId(view, 'email'))).to.exist;

    // Verify the hidden field still exists in the schema.
    expect(mutable.jsonSchema.properties?.['createdAt' as const]).to.exist;

    // Verify getFieldId throws for hidden fields.
    expect(() => getFieldId(view, 'createdAt')).to.throw();

    // Initially hiddenFields should be undefined.
    expect(view.hiddenFields).to.be.undefined;

    // Check that hidden fields is correct.
    const hiddenProps = projection.getHiddenProperties();
    expect(hiddenProps).to.have.length(1);
    expect(hiddenProps[0]).to.equal('createdAt');

    // Verify we can unhide the hidden field.
    projection.unhideFieldProjection('createdAt' as JsonProp);
    expect(projection.getFieldProjection(getFieldId(view, 'createdAt'))).to.exist;
    expect(view.fields).to.have.length(3);
    expect(view.fields.map((f) => f.path)).to.deep.equal(['name', 'email', 'createdAt']);
    expect(projection.getHiddenProperties()).to.have.length(0);

    // Record ID of the createdAt field.
    const createdAtId = getFieldId(view, 'createdAt');

    // Hide again.
    projection.hideFieldProjection(createdAtId);

    // Now the field should be in hiddenFields.
    expect(view.hiddenFields).to.have.length(1);
    expect(view.hiddenFields![0].path).to.equal('createdAt');
    expect(view.hiddenFields![0].id).to.equal(createdAtId);

    expect(view.fields).to.have.length(2);
    expect(view.fields.map((f) => f.path)).to.deep.equal(['name', 'email']);
    expect(() => getFieldId(view, 'createdAt')).to.throw();

    // Unhide using the same property name.
    projection.unhideFieldProjection('createdAt' as JsonProp);

    // Field should be back in visible fields with same ID.
    expect(view.fields).to.have.length(3);
    expect(getFieldId(view, 'createdAt')).to.equal(createdAtId);

    // hiddenFields should be empty now.
    expect(view.hiddenFields).to.have.length(0);

    // Hide the email field.
    const emailId = getFieldId(view, 'email');
    projection.hideFieldProjection(emailId);

    // Check both hidden properties are returned.
    const multipleHidden = projection.getHiddenProperties();
    expect(multipleHidden).to.have.length(1);
    expect(multipleHidden).to.include('email');

    // Ensure schema still matches.
    expect(mutable.getSchemaSnapshot()).to.deep.equal(initialSchema);
  });
});
