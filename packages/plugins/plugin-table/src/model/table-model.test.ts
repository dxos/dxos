//
// Copyright 2024 DXOS.org
//

import { computed } from '@preact/signals-core';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';

import { create } from '@dxos/echo-schema';
import { updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';

import { TableModel } from './table-model';

// TODO(Zan): Restore this when importing the type doesn't break bundling.
// import { TableType } from '../types';

registerSignalsRuntime();

const createTableModel = (): TableModel => {
  // TODO(Zan): Restore schema specification when importing TableType doesn't break bundling.
  const table = create({
    view: {
      fields: [
        { id: 'col1', path: 'col1', label: 'Column 1', type: 'string' },
        { id: 'col2', path: 'col2', label: 'Column 2', type: 'string' },
        { id: 'col3', path: 'col3', label: 'Column 3', type: 'string' },
      ],
    },
  });

  return new TableModel({ table: table as any });
};

describe('TableModel', () => {
  let model: TableModel;

  beforeEach(async () => {
    model = createTableModel();
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

    describe('cell reactivity', () => {
      let data: any[];

      beforeEach(async () => {
        // TODO(Zan): Restore schema specification when importing TableType doesn't break bundling.
        const table = create({
          view: {
            fields: [
              { id: 'col1', path: 'col1', label: 'Column 1', type: 'string' },
              { id: 'col2', path: 'col2', label: 'Column 2', type: 'string' },
              { id: 'col3', path: 'col3', label: 'Column 3', type: 'string' },
            ],
          },
        });

        ({ data } = create({
          data: [
            { col1: 'A', col2: 1, col3: true },
            { col1: 'B', col2: 2, col3: false },
          ],
        }));

        model = new TableModel({ table: table as any });
        model.updateData(data);
        await model.open();
      });

      it('should update cell value reactively', () => {
        using cellUpdates = updateCounter(() => {
          model.cells.value.grid['0,0']?.value;
        });

        data[0].col1 = 'New Value';

        expect(cellUpdates.count).toBe(1);
        expect(model.cells.value.grid['0,0']?.value).toBe('New Value');
      });

      it('should update cells reactively when adding a new row', () => {
        using cellsUpdates = updateCounter(() => {
          model.cells.value;
        });

        data.push({ col1: 'C', col2: 3, col3: true });

        expect(cellsUpdates.count).toBe(1);
        expect(Object.keys(model.cells.value.grid).length).toBe(9); // 3 rows * 3 columns
        expect(model.cells.value.grid['0,2']?.value).toBe('C');
      });

      it('should handle combined operations reactively', () => {
        using cellsUpdates = updateCounter(() => model.cells.value);
        using specificCellUpdates = updateCounter(() => model.cells.value.grid['0,0']?.value);

        data[0].col1 = 'Updated A';
        data.push({ col1: 'C', col2: 3, col3: true });
        data.splice(1, 1);

        expect(cellsUpdates.count).toBe(2);
        expect(Object.keys(model.cells.value.grid).length).toBe(6);

        expect(specificCellUpdates.count).toBe(3);
        expect(model.cells.value.grid['0,0']?.value).toBe('Updated A');

        expect(Object.entries(model.cells.value.grid)).toEqual([
          ['0,0', expect.objectContaining({ value: 'Updated A' })],
          ['1,0', expect.objectContaining({ value: '1' })],
          ['2,0', expect.objectContaining({ value: 'true' })],
          ['0,1', expect.objectContaining({ value: 'C' })],
          ['1,1', expect.objectContaining({ value: '3' })],
          ['2,1', expect.objectContaining({ value: 'true' })],
        ]);
      });
    });
  });
});
