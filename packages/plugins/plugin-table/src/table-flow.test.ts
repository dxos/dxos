//
// Copyright 2026 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import { describe, test } from 'vitest';

import { Filter, JsonSchema, Obj, Type, View } from '@dxos/echo';
import { EffectEx, SchemaEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Table } from '@dxos/react-ui-table/types';
import { ProjectionModel, ViewModel, createEchoChangeCallback, getTypeURIFromQuery } from '@dxos/schema';

import { TablePlugin } from '#plugin';

// Headless coverage for the flows in `composer-app/src/playwright/tables.spec.ts` (currently skipped
// in Playwright). Composer models a table as a `Table` object referencing a `View` that projects a
// stored ECHO schema; rows are plain objects of that schema, columns are `View` fields backed by
// schema properties. The Playwright tests drive the grid UI; here we exercise the same data flows
// via `ViewModel` / `ProjectionModel` (what `TableOperation.Create` and `SpaceOperation.DeleteField`
// use) against a real ECHO space from the composer test harness.

const setup = async () => {
  const harness = await createComposerTestApp({ plugins: [ClientPlugin({}), TablePlugin()] });
  const client = harness.get(ClientCapabilities.Client);
  // The view backing a table is a `View` object; register the schema so its projection can be mutated.
  await client.addTypes([View.View]);
  const { personalSpace } = await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return { harness, db: personalSpace.db };
};

type Db = Awaited<ReturnType<typeof setup>>['db'];

/** Create a table + its view + a fresh stored schema (mirrors `TableOperation.Create`). */
const createTable = async (db: Db) => {
  const { view, jsonSchema } = await ViewModel.makeFromDatabase({ db });
  const table = db.add(Table.make({ name: 'Contacts', view, jsonSchema }));

  // Resolve the stored schema the view queries — rows are objects of this type.
  const typeUri = getTypeURIFromQuery(view.query.ast);
  invariant(typeUri);
  const types = await db.query(Filter.type(Type.Type)).run();
  const type = types.find((entity: Type.AnyEntity) => Type.getURI(entity) === typeUri);
  invariant(type);
  return { table, view, type };
};

const rowCount = async (db: Db, type: Type.AnyEntity): Promise<number> =>
  (await db.query(Filter.type(type)).run()).filter((row: Obj.Any) => !Obj.isDeleted(row)).length;

const makeProjection = (registry: Registry.Registry, view: View.View, type: Type.AnyEntity) =>
  new ProjectionModel({
    registry,
    view,
    baseSchema: JsonSchema.toJsonSchema(type),
    change: createEchoChangeCallback(view, type),
  });

describe('table flow', () => {
  test('create a table with one initial row', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { table, type } = await createTable(db);
    expect(Obj.instanceOf(Table.Table, table)).toBe(true);
    // `makeFromDatabase` seeds one empty row, matching the single data row the grid shows on create.
    expect(await rowCount(db, type)).toBe(1);
  });

  test('add rows', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { type } = await createTable(db);
    expect(await rowCount(db, type)).toBe(1);

    db.add(Obj.make(Type.assertObject(type), {}));
    db.add(Obj.make(Type.assertObject(type), {}));
    expect(await rowCount(db, type)).toBe(3);
  });

  test('delete rows', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { type } = await createTable(db);
    for (let i = 0; i < 4; i++) {
      db.add(Obj.make(Type.assertObject(type), {}));
    }
    expect(await rowCount(db, type)).toBe(5);

    const rows = await db.query(Filter.type(type)).run();
    db.remove(rows[0]);
    db.remove(rows[1]);
    expect(await rowCount(db, type)).toBe(3);
  });

  test('add a column', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { view, type } = await createTable(db);
    const projection = makeProjection(harness.registry, view, type);
    const before = projection.getFields().length;

    projection.createFieldProjection();
    expect(projection.getFields().length).toBe(before + 1);
  });

  test('delete a column', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { view, type } = await createTable(db);
    const projection = makeProjection(harness.registry, view, type);

    const field = projection.createFieldProjection();
    const withNew = projection.getFields().length;
    projection.deleteFieldProjection(field.id);
    expect(projection.getFields().length).toBe(withNew - 1);
  });

  test('rename a column', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { view, type } = await createTable(db);
    const projection = makeProjection(harness.registry, view, type);

    // Rename an existing, schema-backed column (`title`) by pointing its projection at a new property.
    const fieldId = projection.getFieldId('title');
    invariant(fieldId);
    const projected = projection.getFieldProjection(fieldId);
    projection.setFieldProjection({
      field: projected.field,
      props: { ...projected.props, property: 'heading' as SchemaEx.JsonProp },
    });

    const renamed = projection.getFields().find((current) => current.id === fieldId);
    expect(renamed?.path).toBe('heading');
  });
});
