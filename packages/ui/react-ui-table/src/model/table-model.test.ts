//
// Copyright 2024 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { DXN, Filter, JsonSchema, Query, Type } from '@dxos/echo';
import { createEchoSchema } from '@dxos/echo/testing';
import { LocalBackend, MemoryBackend, ViewStateManager } from '@dxos/react-ui-attention';
import { ProjectionModel, ViewModel, createDirectChangeCallback } from '@dxos/schema';

import { Table } from '../types';
import {
  TableModel,
  type TableModelProps,
  createDirectChangeCallback as createTableDirectChangeCallback,
} from './table-model';

// TODO(burdon): Tests are disabled in project.json since they bring in plugin deps.
//  Restore once factored out into react-ui-table.

describe('TableModel', () => {
  let updateCount = 0;
  let model: any;
  let registry: Registry.Registry;

  beforeEach(async () => {
    updateCount = 0;
    registry = Registry.make();
    model = createTableModel(registry, {
      onCellUpdate: () => updateCount++,
    });
    await model.open();
    model.setRows([
      { id: '1', title: 'Test', completed: false },
      { id: '2', title: 'Test 2', completed: true },
      { id: '3', title: 'Test 3', completed: false },
    ]);
  });

  afterEach(async () => {
    await model.close();
  });

  describe('methods', () => {
    test('should pin a row', () => {
      model.pinRow(1, 'top');
      expect(model.pinnedRows.top).toContain(1);
    });

    test('should unpin a row', () => {
      model.pinRow(1, 'top');
      model.unpinRow(1);
      expect(model.pinnedRows.top).not.toContain(1);
    });

    test('should toggle row selection', () => {
      model.selection.toggleSelectionForRowIndex(2);
      expect(model.selection.hasSelection).toBe(true);
    });

    test('should deselect a row', () => {
      model.selection.toggleSelectionForRowIndex(2);
      model.selection.toggleSelectionForRowIndex(2);
      expect(model.selection.hasSelection).toBe(false);
    });

    test('should bulk select rows', () => {
      model.selection.setSelection('all');
      expect(model.selection.allRowsSelected).toBe(true);
      model.selection.setSelection('none');
      expect(model.selection.hasSelection).toBe(false);
    });
  });

  describe('reactivity', () => {
    test('rows should update when setRows is called', () => {
      model.setRows([{ id: '4', title: 'Test 4', completed: false }]);
      expect(model.getRows()).toHaveLength(1);
      expect(model.getRows()[0].id).toBe('4');

      model.setRows([
        { id: '5', title: 'Test 5', completed: false },
        { id: '6', title: 'Test 6', completed: true },
      ]);
      expect(model.getRows()).toHaveLength(2);
      expect(model.getRows()[0].id).toBe('5');
      expect(model.getRows()[1].id).toBe('6');
    });

    test('selection should update when toggled', () => {
      model.selection.toggleSelectionForRowIndex(0);
      expect(model.selection.hasSelection).toBe(true);
      expect(model.selection.selection.size).toBe(1);

      model.selection.toggleSelectionForRowIndex(0);
      expect(model.selection.hasSelection).toBe(false);
      expect(model.selection.selection.size).toBe(0);
    });

    test('derived atoms should reflect current state', () => {
      // Set initial rows.
      model.setRows([
        { id: '1', title: 'Zebra', completed: false },
        { id: '2', title: 'Apple', completed: true },
        { id: '3', title: 'Mango', completed: false },
      ]);

      // Verify rows are accessible.
      const rows = model.getRows();
      expect(rows).toHaveLength(3);
      expect(rows[0].id).toBeDefined();
    });
  });
});

describe('TableModel sort view state', () => {
  // Share `storage` (and the table object) across instances; a fresh registry/manager/model
  // simulates a reload, proving the sort is externalized to the `local` view state keyed by the
  // table URI rather than held per-model.
  const disposables: LocalBackend[] = [];
  afterEach(() => {
    disposables.splice(0).forEach((backend) => backend.dispose());
  });

  test('column sort persists to the local view state and is restored after reload', async () => {
    const storage = fakeStorage();
    const schema = createEchoSchema(Type.getSchema(Test));
    const view = ViewModel.make({ query: Query.select(Filter.type(schema)), jsonSchema: schema.jsonSchema });
    const object = Table.make({ view });

    // Each reopen builds a fresh registry/manager/projection over the SAME table object (and its view),
    // so it exercises a real reload rather than reusing projection state across instances.
    const reopen = async (): Promise<TableModel> => {
      const registry = Registry.make();
      const local = new LocalBackend({ registry, storage });
      disposables.push(local);
      const viewState = new ViewStateManager({ registry, backends: { memory: new MemoryBackend(), local } });
      const projection = new ProjectionModel({
        registry,
        view,
        baseSchema: schema.jsonSchema,
        change: createDirectChangeCallback(view.projection, JsonSchema.toJsonSchema(Type.getSchema(schema))),
      });
      projection.normalizeView();
      const model = new TableModel({
        registry,
        object,
        projection,
        viewState,
        change: createTableDirectChangeCallback(object),
      });
      await model.open();
      return model;
    };

    const first = await reopen();
    const titleFieldId = first.projection.getFields().find((field) => field.path === 'title')!.id;
    first.setSort(titleFieldId, 'asc');
    expect(first.getSorting()).toEqual({ fieldId: titleFieldId, direction: 'asc' });
    expect(JSON.parse(storage.getItem(`dxos:view-state:table-sort:${first.id}`)!)).toEqual({
      fieldId: titleFieldId,
      direction: 'asc',
    });
    await first.close();

    // Reload: fresh registry/manager/projection over the same storage + table object.
    const second = await reopen();
    expect(second.getSorting()).toEqual({ fieldId: titleFieldId, direction: 'asc' });

    second.clearSort();
    expect(second.getSorting()).toBeUndefined();
    await second.close();

    // The cleared sort is also persisted: a further reload reads no sort.
    const third = await reopen();
    expect(third.getSorting()).toBeUndefined();
    await third.close();
  });
});

// Minimal in-memory Storage stand-in (no real localStorage in the test runner).
const fakeStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
};

const Test = Type.makeObject(DXN.make('com.example.type.test', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    completed: Schema.Boolean,
  }),
);

const createTableInputs = (registry: Registry.Registry): { object: Table.Table; projection: ProjectionModel } => {
  const schema = createEchoSchema(Type.getSchema(Test));
  const view = ViewModel.make({
    query: Query.select(Filter.type(schema)),
    jsonSchema: schema.jsonSchema,
  });
  const object = Table.make({ view });
  const projection = new ProjectionModel({
    registry,
    view,
    baseSchema: schema.jsonSchema,
    change: createDirectChangeCallback(view.projection, JsonSchema.toJsonSchema(Type.getSchema(schema))),
  });
  projection.normalizeView();
  return { object, projection };
};

const createTableModel = (registry: Registry.Registry, props: Partial<TableModelProps> = {}): TableModel => {
  const { object, projection } = createTableInputs(registry);
  return new TableModel({
    registry,
    object,
    projection,
    change: createTableDirectChangeCallback(object),
    ...props,
  });
};
