//
// Copyright 2024 DXOS.org
//

import { Schema, SchemaAST } from 'effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { EchoSchemaRegistry } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  EntityKind,
  Format,
  FormatEnum,
  Ref,
  TypeAnnotationId,
  TypeEnum,
  TypedObject,
  getPropertyMetaAnnotation,
  getSchemaTypename,
  toJsonSchema,
  type JsonPath,
  type JsonProp,
  EchoObject,
} from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { invariant } from '@dxos/invariant';

import { createProjection, type Projection } from './projection';
import { ProjectionManager } from './projection-manager';
import { Organization } from '../common/organization';

registerSignalsRuntime();

const getFieldId = (projection: Projection, path: string): string => {
  const field = projection.fields.find((field) => field.path === path);
  invariant(field);
  return field.id;
};

describe('ProjectionManager', () => {
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

    const schema = Schema.Struct({
      name: Schema.String.annotations({ title: 'Name' }),
      email: Format.Email,
      salary: Format.Currency({ code: 'usd', decimals: 2 }),
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });
    const [mutable] = await registry.register([schema]);

    const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const manager = new ProjectionManager(mutable.jsonSchema, projection);
    expect(projection.fields).to.have.length(3);

    {
      const { props } = manager.getFieldProjection(getFieldId(projection, 'name'));
      expect(props).to.deep.eq({
        property: 'name',
        type: TypeEnum.String,
        format: FormatEnum.String,
        title: 'Name',
      });
    }

    {
      const { props } = manager.getFieldProjection(getFieldId(projection, 'email'));
      expect(props).to.include({
        property: 'email',
        type: TypeEnum.String,
        format: FormatEnum.Email,
      });
    }

    manager.setFieldProjection({
      field: {
        id: getFieldId(projection, 'email'),
        path: 'email' as JsonPath,
        size: 100,
      },
    });

    {
      const { field, props } = manager.getFieldProjection(getFieldId(projection, 'email'));
      expect(field).to.include({
        path: 'email',
        size: 100,
      });
      expect(props).to.include({
        property: 'email',
        type: TypeEnum.String,
        format: FormatEnum.Email,
      });

      manager.setFieldProjection({ props });
    }

    {
      const { props } = manager.getFieldProjection(getFieldId(projection, 'salary'));
      expect(props).to.include({
        property: 'salary',
        type: TypeEnum.Number,
        format: FormatEnum.Currency,
        currency: 'USD',
        multipleOf: 2,
      });

      props.currency = 'GBP';
      manager.setFieldProjection({ props });
    }

    {
      const { props } = manager.getFieldProjection(getFieldId(projection, 'salary'));
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

    class Organization extends TypedObject({ typename: 'example.com/type/Organization', version: '0.1.0' })({
      name: Schema.String,
    }) {}

    const schema = Schema.Struct({
      name: Schema.String.annotations({ title: 'Name' }),
      email: Format.Email,
      salary: Format.Currency({ code: 'usd', decimals: 2 }),
      organization: Ref(Organization),
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const manager = new ProjectionManager(mutable.jsonSchema, projection);

    manager.setFieldProjection({
      field: {
        id: getFieldId(projection, 'organization'),
        path: 'organization' as JsonPath,
        referencePath: 'name' as JsonPath,
      },
    });

    const { field, props } = manager.getFieldProjection(getFieldId(projection, 'organization'));

    expect(field).to.deep.eq({
      id: getFieldId(projection, 'organization'),
      path: 'organization',
      referencePath: 'name',
    });

    expect(props).to.deep.eq({
      property: 'organization',
      type: TypeEnum.Ref,
      format: FormatEnum.Ref,
      referenceSchema: 'example.com/type/Organization',
      referencePath: 'name',
    });

    // Note: `referencePath` is stripped from schema.
    expect(mutable.jsonSchema.properties?.['organization' as const]).to.deep.eq({
      $id: '/schemas/echo/ref',
      reference: {
        schema: {
          $ref: 'dxn:type:example.com/type/Organization',
        },
        schemaVersion: '0.1.0',
      },
    });
  });

  test('deletes field projections', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = Schema.Struct({
      name: Schema.String.annotations({ title: 'Name' }),
      email: Format.Email,
    }).annotations({
      [TypeAnnotationId]: {
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const manager = new ProjectionManager(mutable.jsonSchema, projection);

    // Initial state.
    expect(projection.fields).to.have.length(2);
    expect(mutable.jsonSchema.properties?.['email' as const]).to.exist;

    // Delete and verify.
    const { deleted } = manager.deleteFieldProjection(getFieldId(projection, 'email'));
    expect(projection.fields).to.have.length(1);
    expect(mutable.jsonSchema.properties?.['email' as const]).to.not.exist;
    expect(deleted.field.path).to.equal('email');
    expect(deleted.props.format).to.equal(FormatEnum.Email);
  });

  test('field projection delete and restore', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = Schema.Struct({
      name: Schema.optional(Schema.Number),
      email: Schema.optional(Schema.Number),
      description: Schema.optional(Schema.String),
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const manager = new ProjectionManager(mutable.jsonSchema, projection);

    // Capture initial states.
    const initialFieldsOrder = projection.fields.map((f) => f.path);
    const emailIndex = initialFieldsOrder.indexOf('email' as JsonPath);
    const initialEmail = manager.getFieldProjection(getFieldId(projection, 'email'));
    const initialSchemaProps = { ...mutable.jsonSchema.properties! };

    // Delete and restore.
    const { deleted, index } = manager.deleteFieldProjection(getFieldId(projection, 'email'));

    // Verify email is deleted but name is unchanged.
    expect(mutable.jsonSchema.properties!.email).to.be.undefined;
    expect(mutable.jsonSchema.properties!.name).to.deep.equal(initialSchemaProps.name);

    manager.setFieldProjection(deleted, index);

    // Verify field position is restored.
    const restoredFieldsOrder = projection.fields.map((f) => f.path);
    expect(restoredFieldsOrder.indexOf('email' as JsonPath)).to.equal(emailIndex);

    // Verify projection data matches.
    const restored = manager.getFieldProjection(getFieldId(projection, 'email'));
    expect(restored).to.deep.equal(initialEmail);

    // Verify all schema properties match initial state.
    expect(mutable.jsonSchema.properties).to.deep.equal(initialSchemaProps);
  });

  test('property rename', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = Schema.Struct({
      name: Schema.String,
      email: Format.Email,
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const manager = new ProjectionManager(mutable.jsonSchema, projection);

    // Capture initial state.
    const initialFieldsOrder = projection.fields.map((f) => f.path);
    const emailIndex = initialFieldsOrder.indexOf('email' as JsonProp);
    const { field, props } = manager.getFieldProjection(getFieldId(projection, 'email'));

    // Perform rename.
    manager.setFieldProjection({
      field,
      props: { ...props, property: 'primaryEmail' as JsonProp },
    });

    // Verify field order is preserved.
    const updatedFieldsOrder = projection.fields.map((f) => f.path);
    expect(updatedFieldsOrder.length).to.equal(initialFieldsOrder.length);
    expect(updatedFieldsOrder[emailIndex]).to.equal('primaryEmail');

    // Verify the renamed field preserved all properties.
    const renamed = manager.getFieldProjection(getFieldId(projection, 'primaryEmail'));
    expect(renamed.props).to.deep.equal({
      ...props,
      property: 'primaryEmail',
    });

    // Verify old field is completely removed.
    expect(projection.fields.find((f) => f.path === 'email')).to.be.undefined;
    expect(mutable.jsonSchema.properties?.['email' as const]).to.be.undefined;
  });

  test('property rename updates schema propertyOrder and required arrays', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = Schema.Struct({
      name: Schema.String,
      email: Format.Email,
      age: Schema.Number,
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const manager = new ProjectionManager(mutable.jsonSchema, projection);

    // Capture initial state.
    const initialPropertyOrder = [...(mutable.jsonSchema.propertyOrder ?? [])];
    const initialRequired = [...(mutable.jsonSchema.required ?? [])];

    expect(initialPropertyOrder).to.include('email');
    expect(initialRequired).to.include('email');

    // Perform rename: email -> primaryEmail.
    const { field, props } = manager.getFieldProjection(getFieldId(projection, 'email'));
    manager.setFieldProjection({
      field,
      props: { ...props, property: 'primaryEmail' as JsonProp },
    });

    // Verify schema properties are updated correctly.
    expect(mutable.jsonSchema.properties?.['email' as const]).to.be.undefined;
    expect(mutable.jsonSchema.properties?.['primaryEmail' as const]).to.exist;

    // Verify propertyOrder array is updated.
    const updatedPropertyOrder = mutable.jsonSchema.propertyOrder ?? [];
    expect(updatedPropertyOrder).to.not.include('email');
    expect(updatedPropertyOrder).to.include('primaryEmail');
    expect(updatedPropertyOrder.length).to.equal(initialPropertyOrder.length);

    // Verify order is preserved (primaryEmail should be in the same position as email was).
    const emailIndex = initialPropertyOrder.indexOf('email');
    expect(updatedPropertyOrder[emailIndex]).to.equal('primaryEmail');

    // Verify required array is updated.
    const updatedRequired = mutable.jsonSchema.required ?? [];
    expect(updatedRequired).to.not.include('email');
    expect(updatedRequired).to.include('primaryEmail');
    expect(updatedRequired.length).to.equal(initialRequired.length);
  });

  test('single select format', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = Schema.Struct({
      status: Schema.String,
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Task',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const manager = new ProjectionManager(mutable.jsonSchema, projection);
    const fieldId = getFieldId(projection, 'status');
    invariant(fieldId);

    // Set single select format with options.
    manager.setFieldProjection({
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
      annotations: {
        meta: {
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
    const { props } = manager.getFieldProjection(fieldId);

    expect(props.format).to.equal(FormatEnum.SingleSelect);
    expect(props.options).to.deep.equal([
      { id: 'draft', title: 'Draft', color: 'gray' },
      { id: 'published', title: 'Published', color: 'green' },
    ]);

    // Update options.
    manager.setFieldProjection({
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
    expect(mutable.jsonSchema.properties?.status?.annotations).to.deep.include({
      meta: {
        singleSelect: {
          options: [
            { id: 'draft', title: 'Draft', color: 'indigo' },
            { id: 'published', title: 'Published', color: 'blue' },
            { id: 'archived', title: 'Archived', color: 'amber' },
          ],
        },
      },
    });

    const effectSchema = mutable.snapshot;
    expect(() => Schema.validateSync(effectSchema)({ status: 'draft' })).not.to.throw();
    expect(() => Schema.validateSync(effectSchema)({ status: 'published' })).not.to.throw();
    expect(() => Schema.validateSync(effectSchema)({ status: 'archived' })).not.to.throw();
    expect(() => Schema.validateSync(effectSchema)({ status: 'invalid-status' })).to.throw();

    const properties = SchemaAST.getPropertySignatures(effectSchema.ast);
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

  test('multi select format', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = Schema.Struct({
      tags: Schema.String,
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Task',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    const manager = new ProjectionManager(mutable.jsonSchema, projection);
    const fieldId = getFieldId(projection, 'tags');
    invariant(fieldId);

    manager.setFieldProjection({
      field: { id: fieldId, path: 'tags' as JsonPath },
      props: {
        property: 'tags' as JsonProp,
        type: TypeEnum.Object,
        format: FormatEnum.MultiSelect,
        options: [
          { id: 'feature', title: 'Feature', color: 'emerald' },
          { id: 'bug', title: 'Bug', color: 'red' },
          { id: 'needs-more-info', title: 'Needs More Info', color: 'amber' },
        ],
      },
    });

    expect(mutable.jsonSchema.properties?.tags).to.deep.include({
      type: 'object',
      format: 'multi-select',
      annotations: {
        meta: {
          multiSelect: {
            options: [
              { id: 'feature', title: 'Feature', color: 'emerald' },
              { id: 'bug', title: 'Bug', color: 'red' },
              { id: 'needs-more-info', title: 'Needs More Info', color: 'amber' },
            ],
          },
        },
      },
    });

    const { props } = manager.getFieldProjection(fieldId);

    expect(props.format).to.equal(FormatEnum.MultiSelect);
    expect(props.options).to.deep.equal([
      { id: 'feature', title: 'Feature', color: 'emerald' },
      { id: 'bug', title: 'Bug', color: 'red' },
      { id: 'needs-more-info', title: 'Needs More Info', color: 'amber' },
    ]);

    manager.setFieldProjection({
      field: { id: fieldId, path: 'tags' as JsonPath },
      props: {
        ...props,
        property: 'tags' as JsonProp,
        options: [
          { id: 'draft', title: 'Draft', color: 'indigo' },
          { id: 'published', title: 'Published', color: 'blue' },
          { id: 'archived', title: 'Archived', color: 'amber' },
        ],
      },
    });

    const updatedProjection = manager.getFieldProjection(fieldId);
    expect(updatedProjection.props.options).to.deep.equal([
      { id: 'draft', title: 'Draft', color: 'indigo' },
      { id: 'published', title: 'Published', color: 'blue' },
      { id: 'archived', title: 'Archived', color: 'amber' },
    ]);

    expect(mutable.jsonSchema.properties?.tags?.annotations).to.deep.include({
      meta: {
        multiSelect: {
          options: [
            { id: 'draft', title: 'Draft', color: 'indigo' },
            { id: 'published', title: 'Published', color: 'blue' },
            { id: 'archived', title: 'Archived', color: 'amber' },
          ],
        },
      },
    });

    // Verify updated JSON Schema.
    expect(mutable.jsonSchema.properties?.tags?.annotations).to.deep.include({
      meta: {
        multiSelect: {
          options: [
            { id: 'draft', title: 'Draft', color: 'indigo' },
            { id: 'published', title: 'Published', color: 'blue' },
            { id: 'archived', title: 'Archived', color: 'amber' },
          ],
        },
      },
    });

    const effectSchema = mutable.snapshot;
    expect(effectSchema).not.toBeUndefined;
    expect(() => Schema.validateSync(effectSchema)({ tags: ['draft'] })).not.to.throw();
    expect(() => Schema.validateSync(effectSchema)({ tags: ['published'] })).not.to.throw();

    // TODO(ZaymonFC): Get validation working.
    // expect(() => Schema.validateSync(effectSchema)({ tags: ['archived', 'NOT'] })).to.throw();
    // expect(() => Schema.validateSync(effectSchema)({ tags: 'invalid-status' })).to.throw();

    const properties = SchemaAST.getPropertySignatures(effectSchema.ast);
    const statusProperty = properties.find((p) => p.name === 'tags');
    invariant(statusProperty);
    const statusPropertyMeta = getPropertyMetaAnnotation(statusProperty, 'multiSelect');

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

    const schema = Schema.Struct({
      name: Schema.String,
      email: Format.Email,
      createdAt: Schema.String,
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);

    // Create view with only name and email fields.
    const projection = createProjection({
      typename: mutable.typename,
      jsonSchema: mutable.jsonSchema,
      fields: [
        'name',
        'email',
        // createdAt intentionally omitted.
      ],
    });

    const manager = new ProjectionManager(mutable.jsonSchema, projection);
    const initialSchema = mutable.snapshot;

    // Verify only the included fields are in the view.
    expect(projection.fields).to.have.length(2);
    expect(projection.fields.map((f) => f.path)).to.deep.equal(['name', 'email']);

    // Verify we can get projections for visible fields.
    expect(manager.getFieldProjection(getFieldId(projection, 'name'))).to.exist;
    expect(manager.getFieldProjection(getFieldId(projection, 'email'))).to.exist;

    // Verify the hidden field still exists in the schema.
    expect(mutable.jsonSchema.properties?.['createdAt' as const]).to.exist;

    // Verify getFieldId throws for hidden fields.
    expect(() => getFieldId(projection, 'createdAt')).to.throw();

    // Check that hidden fields is correct.
    const hiddenProps = manager.getHiddenProperties();
    expect(hiddenProps).to.have.length(1);
    expect(hiddenProps[0]).to.equal('createdAt');

    // Verify we can unhide the hidden field.
    manager.showFieldProjection('createdAt' as JsonProp);
    expect(manager.getFieldProjection(getFieldId(projection, 'createdAt'))).to.exist;
    expect(projection.fields).to.have.length(3);
    expect(projection.fields.map((f) => f.path)).to.deep.equal(['name', 'email', 'createdAt']);
    expect(manager.getHiddenProperties()).to.deep.equal([]);

    // Record ID of the createdAt field.
    const createdAtId = getFieldId(projection, 'createdAt');

    // Hide again.
    manager.hideFieldProjection(createdAtId);

    // Now the field should be in hiddenFields.
    expect(projection.hiddenFields).to.have.length(1);
    expect(projection.hiddenFields![0].path).to.equal('createdAt');
    expect(projection.hiddenFields![0].id).to.equal(createdAtId);

    expect(projection.fields).to.have.length(2);
    expect(projection.fields.map((f) => f.path)).to.deep.equal(['name', 'email']);
    expect(() => getFieldId(projection, 'createdAt')).to.throw();

    // Unhide using the same property name.
    manager.showFieldProjection('createdAt' as JsonProp);

    // Field should be back in visible fields with same ID.
    expect(projection.fields).to.have.length(3);
    expect(getFieldId(projection, 'createdAt')).to.equal(createdAtId);

    // hiddenFields should be empty now.
    expect(projection.hiddenFields).to.have.length(0);

    // Hide the email field.
    const emailId = getFieldId(projection, 'email');
    manager.hideFieldProjection(emailId);
    manager.hideFieldProjection(createdAtId);

    // Check both hidden properties are returned.
    const multipleHidden = manager.getHiddenProperties();
    expect(multipleHidden).to.have.length(2);
    expect(multipleHidden).to.include('email');
    expect(multipleHidden).to.include('createdAt');

    // Unhide email and verify ID is preserved
    manager.showFieldProjection('email' as JsonProp);
    expect(getFieldId(projection, 'email')).to.equal(emailId);

    // Ensure schema still matches.
    expect(mutable.snapshot).to.deep.equal(initialSchema);
  });

  test('schema fields are automatically added to hiddenFields', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    // Create schema with three properties.
    const schema = Schema.Struct({
      title: Schema.String,
      description: Schema.String,
      status: Schema.String,
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Task',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);

    // Create view with no explicit fields.
    const projection = createProjection({
      typename: mutable.typename,
      jsonSchema: mutable.jsonSchema,
      fields: [], // No fields specified.
    });

    // Create projection.
    void new ProjectionManager(mutable.jsonSchema, projection);

    // Verify all schema fields were added to hiddenFields.
    expect(projection.hiddenFields).to.exist;
    expect(projection.hiddenFields).to.have.length(3);

    const hiddenPaths = projection.hiddenFields!.map((field) => field.path).sort();
    expect(hiddenPaths).to.deep.equal(['description', 'status', 'title']);
  });

  test('normalizeView syncs fields with schema changes', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    // Create initial schema with a single field.
    const initialSchema = Schema.Struct({
      title: Schema.String,
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Task',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([initialSchema]);

    // Create empty view (no fields).
    const projection = createProjection({
      typename: mutable.typename,
      jsonSchema: mutable.jsonSchema,
      fields: [],
    });

    // Initialize projection.
    void new ProjectionManager(mutable.jsonSchema, projection);

    // Verify title is in hiddenFields.
    expect(projection.hiddenFields).to.have.length(1);
    expect(projection.hiddenFields![0].path).to.equal('title');

    // Modify the schema - add a field.
    mutable.jsonSchema.properties!.status = { type: 'string' };

    // Create new projection to trigger normalization.
    void new ProjectionManager(mutable.jsonSchema, projection);

    // Verify status was added to hiddenFields.
    expect(projection.hiddenFields).to.have.length(2);
    const paths = projection.hiddenFields!.map((f) => f.path).sort();
    expect(paths).to.deep.equal(['status', 'title']);
  });

  test('deleted fields should not appear in hidden properties after reinitialization', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    const schema = Schema.Struct({
      name: Schema.String,
      email: Format.Email,
      phone: Schema.String,
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/Person',
        version: '0.1.0',
      },
    });

    const [mutable] = await registry.register([schema]);
    const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
    let manager = new ProjectionManager(mutable.jsonSchema, projection);

    // Initial state
    expect(projection.fields).to.have.length(3);
    expect(manager.getHiddenProperties()).to.have.length(0);

    // Delete a field
    const emailId = getFieldId(projection, 'email');
    manager.deleteFieldProjection(emailId);

    // Verify it's deleted from the schema and view.fields
    expect(projection.fields).to.have.length(2);
    expect(mutable.jsonSchema.properties?.['email' as const]).to.be.undefined;

    // Verify it doesn't show up in hidden properties
    let hiddenProps = manager.getHiddenProperties();
    expect(hiddenProps).to.not.include('email');

    // Reinitialize projection to trigger normalization
    manager = new ProjectionManager(mutable.jsonSchema, projection);

    // Verify field is still deleted and not in hidden properties
    expect(projection.fields).to.have.length(2);
    expect(mutable.jsonSchema.properties?.['email' as const]).to.be.undefined;
    hiddenProps = manager.getHiddenProperties();
    expect(hiddenProps).to.not.include('email');
  });

  test('create view from static organization schema', async ({ expect }) => {
    const schema = Organization;
    const jsonSchema = toJsonSchema(schema);

    const projection = createProjection({ typename: getSchemaTypename(schema), jsonSchema });
    const manager = new ProjectionManager(jsonSchema, projection);
    const fieldId = getFieldId(projection, 'status');
    invariant(fieldId);

    const { field, props } = manager.getFieldProjection(fieldId);
    expect(field.path).toEqual('status');
    expect(props).toEqual({
      property: 'status',
      title: 'Status',
      type: 'string',
      format: 'single-select',
      options: [
        {
          color: 'indigo',
          id: 'prospect',
          title: 'Prospect',
        },
        {
          color: 'purple',
          id: 'qualified',
          title: 'Qualified',
        },
        {
          color: 'amber',
          id: 'active',
          title: 'Active',
        },
        {
          color: 'emerald',
          id: 'commit',
          title: 'Commit',
        },
        {
          color: 'red',
          id: 'reject',
          title: 'Reject',
        },
      ],
    });
  });

  test('property that is an array of objects', () => {
    const ContactWithArrayOfEmails = Schema.Struct({
      name: Schema.String,
      emails: Schema.optional(
        Schema.Array(
          Schema.Struct({
            value: Schema.String,
            label: Schema.String.pipe(Schema.optional),
          }),
        ),
      ),
    }).pipe(EchoObject({ typename: 'dxos.org/type/ContactWithArrayOfEmails', version: '0.1.0' }));

    const jsonSchema = toJsonSchema(ContactWithArrayOfEmails);

    const projection = createProjection({ typename: ContactWithArrayOfEmails.typename, jsonSchema });
    const manager = new ProjectionManager(jsonSchema, projection);

    const fieldId = getFieldId(projection, 'emails');
    const field = manager.getFieldProjection(fieldId!);

    console.log(field);
  });

  test('changing format to missing formats', async ({ expect }) => {
    const testCases = [
      { format: FormatEnum.Integer, expectedType: TypeEnum.Number, fieldName: 'count' },
      { format: FormatEnum.DXN, expectedType: TypeEnum.String, fieldName: 'identifier' },
      { format: FormatEnum.Hostname, expectedType: TypeEnum.String, fieldName: 'host' },
    ];

    for (const { format, expectedType, fieldName } of testCases) {
      // Arrange.
      const { db } = await builder.createDatabase();
      const registry = new EchoSchemaRegistry(db);

      const schemaType = expectedType === TypeEnum.Number ? Schema.Number : Schema.String;
      const schema = Schema.Struct({
        [fieldName]: schemaType,
      }).annotations({
        [TypeAnnotationId]: {
          kind: EntityKind.Object,
          typename: 'example.com/type/TestObject',
          version: '0.1.0',
        },
      });

      const [mutable] = await registry.register([schema]);
      const projection = createProjection({ typename: mutable.typename, jsonSchema: mutable.jsonSchema });
      const manager = new ProjectionManager(mutable.jsonSchema, projection);
      const fieldId = getFieldId(projection, fieldName);
      invariant(fieldId);

      // Act.
      manager.setFieldProjection({
        field: { id: fieldId, path: fieldName as JsonPath },
        props: {
          property: fieldName as JsonProp,
          type: expectedType,
          format,
        },
      });

      // Assert.
      const { props } = manager.getFieldProjection(fieldId);
      expect(props.format).to.equal(format);
      expect(props.type).to.equal(expectedType);

      // Verify the underlying JSON schema was updated correctly.
      expect(mutable.jsonSchema.properties?.[fieldName]).to.deep.include({
        type: expectedType.toLowerCase(),
        format,
      });
    }
  });

  test('Email validation persists after schema registration round-trip', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new EchoSchemaRegistry(db);

    // Verify Format.Email has validation
    expect(() => Schema.validateSync(Format.Email)('valid@example.com')).not.toThrow();
    expect(() => Schema.validateSync(Format.Email)('invalid-email')).toThrow(/Email/);

    // Create and register schema using Format.Email
    const schema = Schema.Struct({
      email: Format.Email,
    }).annotations({
      [TypeAnnotationId]: {
        kind: EntityKind.Object,
        typename: 'example.com/type/EmailTest',
        version: '0.1.0',
      },
    });

    // Check with the primary schema
    expect(() => Schema.validateSync(schema)({ email: 'valid@example.com' })).not.toThrow();
    expect(() => Schema.validateSync(schema)({ email: 'invalid-email' })).toThrow();

    const [registeredSchema] = await registry.register([schema]);

    // Verify JSON schema preserves the validation constraint
    const emailJsonSchema = registeredSchema.jsonSchema.properties?.email;
    expect(emailJsonSchema).toMatchObject({
      type: 'string',
      format: 'email',
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    });

    // Verify reconstructed Effect schema maintains validation
    const reconstructedSchema = registeredSchema.snapshot;

    expect(() => Schema.validateSync(reconstructedSchema)({ email: 'valid@example.com' })).not.toThrow();
    expect(() => Schema.validateSync(reconstructedSchema)({ email: 'invalid-email' })).toThrow();
  });
});
