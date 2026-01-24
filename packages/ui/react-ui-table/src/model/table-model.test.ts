//
// Copyright 2024 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Query, Type } from '@dxos/echo';
import { createEchoSchema } from '@dxos/echo/testing';
import { ProjectionModel, View, createDirectChangeCallback } from '@dxos/schema';

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

const Test = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Test',
    version: '0.1.0',
  }),
);

const createTableModel = (registry: Registry.Registry, props: Partial<TableModelProps> = {}): TableModel => {
  const schema = createEchoSchema(Test);
  const view = View.make({
    query: Query.select(Filter.type(schema)),
    jsonSchema: schema.jsonSchema,
  });
  const object = Table.make({ view });
  const projection = new ProjectionModel(
    schema.jsonSchema,
    view.projection,
    createDirectChangeCallback(view.projection, schema.jsonSchema),
  );
  return new TableModel({
    registry,
    object,
    projection,
    change: createTableDirectChangeCallback(object),
    ...props,
  });
};
