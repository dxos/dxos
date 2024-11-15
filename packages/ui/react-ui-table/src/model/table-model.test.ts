//
// Copyright 2024 DXOS.org
//

import { computed } from '@preact/signals-core';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';

import { S, TypedObject, create } from '@dxos/echo-schema';
import { createMutableSchema, updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { createView, ViewProjection } from '@dxos/schema';

import { TableModel, type TableModelProps } from './table-model';
import { TableType } from '../types';

// TODO(burdon): Tests are disabled in project.json since they bring in plugin deps.
//  Restore once factored out into react-ui-table.

registerSignalsRuntime();

describe('TableModel', () => {
  let updateCount = 0;
  let model: TableModel;

  beforeEach(async () => {
    updateCount = 0;
    model = createTableModel({
      onCellUpdate: () => updateCount++,
    });
    await model.open();
  });

  afterEach(async () => {
    await model.close();
  });

  describe('methods', () => {
    it('should set sorting', () => {
      model.setSort('col2', 'asc');
      expect(model.sorting).toEqual([{ columnId: 'col2', direction: 'asc' }]);
    });

    it('should pin a row', () => {
      model.pinRow(1, 'top');
      expect(model.pinnedRows.top).toContain(1);
    });

    it('should unpin a row', () => {
      model.pinRow(1, 'top');
      model.unpinRow(1);
      expect(model.pinnedRows.top).not.toContain(1);
    });

    it('should select a row', () => {
      model.selectRow(2);
      expect(model.rowSelection).toContain(2);
    });

    it('should deselect a row', () => {
      model.selectRow(2);
      model.deselectRow(2);
      expect(model.rowSelection).not.toContain(2);
    });

    it('should deselect all rows', () => {
      model.selectRow(1);
      model.selectRow(2);
      model.deselectAllRows();
      expect(model.rowSelection).toHaveLength(0);
    });
  });

  describe('reactivity', () => {
    it('pure signals should nest', () => {
      const signal$ = create({ arr: [{ thingInside: 1 }, { thingInside: 2 }] });

      const computed$ = computed(() => {
        return signal$.arr.map((row) =>
          computed(() => {
            return row.thingInside;
          }),
        );
      });

      using outerCounter = updateCounter(() => {
        computed$.value.map((c) => c.value);
      });

      using innerCounter = updateCounter(() => {
        computed$.value[0].value;
      });

      expect(computed$.value.map((v) => v.value)).toEqual([1, 2]);

      signal$.arr[0].thingInside = 3;

      expect(computed$.value.map((v) => v.value)).toEqual([3, 2]);
      expect(outerCounter.count).toBe(1);
      expect(innerCounter.count).toBe(1);
    });

    describe('row reactivity', () => {
      let data: any[];

      beforeEach(async () => {
        // TODO(burdon): Use generator.
        ({ data } = create({
          data: [
            { col1: 'A', col2: 1, col3: true },
            { col1: 'B', col2: 2, col3: false },
          ],
        }));

        const model = createTableModel();
        model.setRows(data);
        await model.open();
      });

      it('should update with row-level reactivity', () => {
        // Set up visible range to include our test data
        model.getCells({ start: { row: 0, col: 0 }, end: { row: 1, col: 2 } }, 'grid');

        // Trigger a row update
        data[0].col1 = 'New Value';
        expect(updateCount).toBe(1);

        // Verify the new value through getCells
        const cells = model.getCells({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }, 'grid');
        expect(cells['0,0']?.value).toBe('New Value');
      });

      it('should update reactively when adding a new row', () => {
        // Set up visible range to include our test data
        model.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

        data.push({ col1: 'C', col2: 3, col3: true });
        expect(updateCount).toBe(1);

        const cells = model.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

        // Verify the new row's data
        expect(cells['0,2']?.value).toBe('C');
        expect(cells['1,2']?.value).toBe('3');
        expect(cells['2,2']?.value).toBe('true');
      });

      it('should handle combined operations reactively', () => {
        // Set up visible range
        model.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

        // Multiple operations
        data[0].col1 = 'Updated A';
        data.push({ col1: 'C', col2: 3, col3: true });
        data.splice(1, 1);

        // We expect one update per operation affecting visible rows
        expect(updateCount).toBe(3);

        const cells = model.getCells({ start: { row: 0, col: 0 }, end: { row: 1, col: 2 } }, 'grid');

        // Verify final state
        expect(cells['0,0']?.value).toBe('Updated A');
        expect(cells['0,1']?.value).toBe('C');
        expect(cells['1,1']?.value).toBe('3');
        expect(cells['2,1']?.value).toBe('true');
      });
    });
  });
});

class Test extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
  title: S.String,
  completed: S.Boolean,
}) {}

const createTableModel = (props: Partial<TableModelProps> = {}): TableModel => {
  const schema = createMutableSchema(Test);
  const view = createView({ name: 'Test', typename: schema.typename, jsonSchema: schema.jsonSchema });
  const projection = new ViewProjection(schema, view);
  const table = create(TableType, { view });
  return new TableModel({ table, projection, ...props });
};
