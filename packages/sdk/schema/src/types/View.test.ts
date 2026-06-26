//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, assert, beforeEach, describe, test } from 'vitest';

import { Filter, JsonSchema, Obj, Query, Ref, Type } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Format, TypeEnum } from '@dxos/echo/Format';
import { DXN } from '@dxos/keys';
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
    const registry = makeRegistry();
    registry.add([TestSchema.Person, TestSchema.Organization]);

    const view = await ViewModel.makeWithReferences({
      query: Query.select(Filter.type(schema)),
      jsonSchema,
      registry,
    });
    assert(view.query.ast.type === 'select');
    assert(view.query.ast.filter.type === 'object');
    expect(view.query.ast.filter.typename).to.eq(Type.getURI(schema)?.toString());
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
    expect(Obj.getTypename(organization)).to.eq(Type.getTypename(TestSchema.Organization));
    expect(Obj.getTypename(contact)).to.eq(Type.getTypename(TestSchema.Person));
  });

  // The overrideSchema param is passed to ViewModel.make/makeFromDatabase so a view can
  // display a customised superset of the underlying type's fields without mutating the type.
  // The bug: overrideSchema is stored in view.projection.schema but the field initialisation
  // loop still iterates jsonSchema (the base schema), so any field present only in the
  // override is silently dropped — the table renders with fewer columns than intended.
  // TODO(wittjosiah): ViewModel.make stores overrideSchema in view.projection.schema but initializes
  // fields from jsonSchema (the base), so fields present only in the override are dropped. Unskip
  // once field initialization merges the override schema.
  test.skip('create view with overrideSchema should project fields from override schema', ({ expect }) => {
    const typename = 'com.example.type.task';

    // Base schema: only 'title'.
    const baseType = Type.makeObjectFromJsonSchema({
      typename,
      version: '0.1.0',
      jsonSchema: JsonSchema.toJsonSchema(
        Schema.Struct({
          title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
        }),
      ),
    });

    // Override schema: 'title' + extra 'priority' field.
    const overrideType = Type.makeObjectFromJsonSchema({
      typename,
      version: '0.1.0',
      jsonSchema: JsonSchema.toJsonSchema(
        Schema.Struct({
          title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
          priority: Schema.optional(Schema.Number).annotations({ title: 'Priority' }),
        }),
      ),
    });

    const view = ViewModel.make({
      query: Query.select(Filter.type(DXN.make(typename))),
      jsonSchema: baseType.jsonSchema,
      overrideSchema: overrideType.jsonSchema,
    });

    // The override schema is correctly stored in view.projection.schema.
    expect(Object.keys(view.projection.schema?.properties ?? {})).toContain('priority');

    // When overrideSchema is provided the view's projection fields should reflect it —
    // 'priority' only exists in the override, so it must appear in the projected fields.
    // FAILS: field initialisation uses jsonSchema (base), so only 'title' is projected
    // and 'priority' is silently absent.
    const fieldPaths = view.projection.fields.map((f) => f.path);
    expect(fieldPaths).toContain('priority');
  });

  // ViewModel.makeFromDatabase uses db.addType to persist a schema, then queries it back.
  // For database type entities (non-registry), the view should be created with the correct fields.
  test('makeFromDatabase creates view with fields for a database type entity (static schema)', async ({ expect }) => {
    const { db } = await builder.createDatabase();

    const typename = 'com.example.type.dbtask';
    const staticSchema = Schema.Struct({
      title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
      status: Schema.optional(Schema.String).annotations({ title: 'Status' }),
    }).pipe(Type.makeObject(DXN.make(typename, '0.1.0')));

    await db.addType(staticSchema);

    const { view, jsonSchema } = await ViewModel.makeFromDatabase({ db, typename });
    const fieldPaths = view.projection.fields.map((f) => f.path);
    expect(fieldPaths).toContain('title');
    expect(fieldPaths).toContain('status');
    expect(jsonSchema.typename).toBe(typename);
  });

  // Type-picker forms (TypeOptions) supply the versioned type URI as the field value, not the bare
  // typename, so makeFromDatabase must resolve a type by its URI as well.
  test('makeFromDatabase resolves a type by its URI', async ({ expect }) => {
    const { db } = await builder.createDatabase();

    const typename = 'com.example.type.dburi';
    const staticSchema = Schema.Struct({
      title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
    }).pipe(Type.makeObject(DXN.make(typename, '0.1.0')));

    const addedType = await db.addType(staticSchema);

    const { view, jsonSchema } = await ViewModel.makeFromDatabase({ db, typename: Type.getURI(addedType) });
    const fieldPaths = view.projection.fields.map((f) => f.path);
    expect(fieldPaths).toContain('title');
    expect(jsonSchema.typename).toBe(typename);
  });

  // When the type is created via makeObjectFromJsonSchema (the raw JSON schema path used by
  // schema-tools and other dynamic type editors), makeFromDatabase must still produce a valid view.
  test('makeFromDatabase creates view with fields for a database type entity (makeObjectFromJsonSchema)', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase();

    const typename = 'com.example.type.dbjsontask';
    const jsonSchemaInput = JsonSchema.toJsonSchema(
      Schema.Struct({
        title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
        priority: Schema.optional(Schema.Number).annotations({ title: 'Priority' }),
      }),
    );
    const typeEntity = Type.makeObjectFromJsonSchema({
      typename,
      version: '0.1.0',
      jsonSchema: jsonSchemaInput,
    });

    await db.addType(typeEntity);

    const { view, jsonSchema } = await ViewModel.makeFromDatabase({ db, typename });
    const fieldPaths = view.projection.fields.map((f) => f.path);
    expect(fieldPaths).toContain('title');
    expect(fieldPaths).toContain('priority');
    expect(jsonSchema.typename).toBe(typename);
  });

  // Objects from DB type entities are stamped with the entity's echo:/@:<id> URI, not the typename
  // DXN, so the view query must use Filter.type (not Filter.typename) to find them.
  test('makeFromDatabase with no typename: view query finds initial object via Filter.type', async ({ expect }) => {
    const { db } = await builder.createDatabase();

    const { view, jsonSchema } = await ViewModel.makeFromDatabase({ db });
    const fieldPaths = view.projection.fields.map((f) => f.path);
    expect(fieldPaths).toContain('title');
    expect(jsonSchema.typename).toBeTruthy();

    const types = await db.query(Filter.type(Type.Type)).run();
    const typeEntity = types.find((t) => Type.getTypename(t) === jsonSchema.typename);
    assert(typeEntity != null, 'type entity must exist in the db');

    const byType = await db.query(Filter.type(typeEntity)).run();
    expect(byType).toHaveLength(1);

    const byTypename = await db.query(Filter.type(DXN.make(jsonSchema.typename!))).run();
    expect(byTypename).toHaveLength(0);
  });

  test('maintains field order during initialization', async ({ expect }) => {
    const schema = Type.makeObjectFromJsonSchema({
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
      query: Query.select(Filter.type(schema)),
      jsonSchema: schema.jsonSchema,
      fields: ['name', 'email', 'salary'], // Explicitly define order.
    });

    // Verify initial field order.
    const fieldOrder = view.projection.fields.map((f) => f.path);
    expect(fieldOrder).to.deep.equal(['name', 'email', 'salary']);
  });
});
