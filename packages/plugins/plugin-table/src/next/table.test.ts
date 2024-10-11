//
// Copyright 2024 DXOS.org
//

import { computed } from '@preact/signals-core';
import { describe, it, expect } from 'vitest';

import { create } from '@dxos/echo-schema';
import { updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';

import { TableModel, type TableAction } from './table';

registerSignalsRuntime();

const createInitialTableModel = (): TableModel =>
  new TableModel(
    [
      { id: 'col1', dataType: 'string', headerLabel: 'Column 1', accessor: (row: any) => row.col1 },
      { id: 'col2', dataType: 'number', headerLabel: 'Column 2', accessor: (row: any) => row.col2 },
      { id: 'col3', dataType: 'boolean', headerLabel: 'Column 3', accessor: (row: any) => row.col3 },
    ],
    [],
  );

export const applyActions = (events: TableAction[]): TableModel => {
  const model = createInitialTableModel();
  for (const event of events) {
    model.dispatch(event);
  }
  return model;
};

describe('updateTable', () => {
  it('should set sorting', () => {
    const events: TableAction[] = [{ type: 'SetSort', columnId: 'col2', direction: 'asc' }];
    const newTable = applyActions(events);
    expect(newTable.sorting).toEqual([{ columnId: 'col2', direction: 'asc' }]);
  });

  it('should move a column', () => {
    const events: TableAction[] = [{ type: 'MoveColumn', columnId: 'col1', newIndex: 2 }];
    const newTable = applyActions(events);
    expect(newTable.columnOrdering).toEqual(['col2', 'col3', 'col1']);
  });

  it('should pin a row', () => {
    const events: TableAction[] = [{ type: 'PinRow', rowIndex: 1, side: 'top' }];
    const newTable = applyActions(events);
    expect(newTable.pinnedRows.top).toContain(1);
  });

  it('should unpin a row', () => {
    const events: TableAction[] = [
      { type: 'PinRow', rowIndex: 1, side: 'top' },
      { type: 'UnpinRow', rowIndex: 1 },
    ];
    const newTable = applyActions(events);
    expect(newTable.pinnedRows.top).not.toContain(1);
  });

  it('should select a row', () => {
    const events: TableAction[] = [{ type: 'SelectRow', rowIndex: 2 }];
    const newTable = applyActions(events);
    expect(newTable.rowSelection).toContain(2);
  });

  it('should deselect a row', () => {
    const events: TableAction[] = [
      { type: 'SelectRow', rowIndex: 2 },
      { type: 'DeselectRow', rowIndex: 2 },
    ];
    const newTable = applyActions(events);
    expect(newTable.rowSelection).not.toContain(2);
  });

  it('should deselect all rows', () => {
    const events: TableAction[] = [
      { type: 'SelectRow', rowIndex: 1 },
      { type: 'SelectRow', rowIndex: 2 },
      { type: 'DeselectAllRows' },
    ];
    const newTable = applyActions(events);
    expect(newTable.rowSelection).toHaveLength(0);
  });
});

describe('column width modification', () => {
  it('should modify an existing column width', () => {
    const events: TableAction[] = [{ type: 'ModifyColumnWidth', columnIndex: 0, width: 120 }];
    const newTable = applyActions(events);
    expect(newTable.columnWidths[newTable.columnOrdering[0]]).toBe(120);
  });

  it('should not affect other column widths when modifying one', () => {
    const initialTable = createInitialTableModel();
    const initialCol2Width = initialTable.columnWidths[initialTable.columnOrdering[1]];
    const initialCol3Width = initialTable.columnWidths[initialTable.columnOrdering[2]];
    const events: TableAction[] = [{ type: 'ModifyColumnWidth', columnIndex: 0, width: 120 }];
    const newTable = applyActions(events);
    expect(newTable.columnWidths[newTable.columnOrdering[1]]).toBe(initialCol2Width);
    expect(newTable.columnWidths[newTable.columnOrdering[2]]).toBe(initialCol3Width);
  });

  it('should handle multiple width modifications', () => {
    const events: TableAction[] = [
      { type: 'ModifyColumnWidth', columnIndex: 0, width: 120 },
      { type: 'ModifyColumnWidth', columnIndex: 1, width: 80 },
      { type: 'ModifyColumnWidth', columnIndex: 2, width: 200 },
    ];
    const modifiedTable = applyActions(events);

    expect(modifiedTable.columnWidths[modifiedTable.columnOrdering[0]]).toBe(120);
    expect(modifiedTable.columnWidths[modifiedTable.columnOrdering[1]]).toBe(80);
    expect(modifiedTable.columnWidths[modifiedTable.columnOrdering[2]]).toBe(200);
  });

  it('should allow setting width to 0', () => {
    const events: TableAction[] = [{ type: 'ModifyColumnWidth', columnIndex: 0, width: 0 }];
    const newTable = applyActions(events);
    expect(newTable.columnWidths[newTable.columnOrdering[0]]).toBe(0);
  });

  it('should ignore modifications for non-existent column indices', () => {
    const events: TableAction[] = [{ type: 'ModifyColumnWidth', columnIndex: 999, width: 100 }];
    const newTable = applyActions(events);
    expect(newTable.columnWidths).toEqual(createInitialTableModel().columnWidths);
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
    it('should update cell value reactively', () => {
      const { data } = create({
        data: [
          { col1: 'A', col2: 1, col3: true },
          { col1: 'B', col2: 2, col3: false },
        ],
      });

      const table = new TableModel(
        [
          { id: 'col1', dataType: 'string', headerLabel: 'Column 1', accessor: (row: any) => row.col1 },
          { id: 'col2', dataType: 'number', headerLabel: 'Column 2', accessor: (row: any) => row.col2 },
          { id: 'col3', dataType: 'boolean', headerLabel: 'Column 3', accessor: (row: any) => row.col3 },
        ],
        data,
      );

      using cellUpdates = updateCounter(() => {
        table.cells.value.grid['0,0']?.value;
      });

      data[0].col1 = 'New Value';

      expect(cellUpdates.count).toBe(1);
      expect(table.cells.value.grid['0,0']?.value).toBe('New Value');
    });

    it('should update cells reactively when adding a new row', () => {
      const { data } = create({
        data: [
          { col1: 'A', col2: 1, col3: true },
          { col1: 'B', col2: 2, col3: false },
        ],
      });

      const table = new TableModel(
        [
          { id: 'col1', dataType: 'string', headerLabel: 'Column 1', accessor: (row: any) => row.col1 },
          { id: 'col2', dataType: 'number', headerLabel: 'Column 2', accessor: (row: any) => row.col2 },
          { id: 'col3', dataType: 'boolean', headerLabel: 'Column 3', accessor: (row: any) => row.col3 },
        ],
        data,
      );

      using cellsUpdates = updateCounter(() => {
        table.cells.value;
      });

      data.push({ col1: 'C', col2: 3, col3: true });

      expect(cellsUpdates.count).toBe(1);
      expect(Object.keys(table.cells.value.grid).length).toBe(9); // 3 rows * 3 columns
      expect(table.cells.value.grid['0,2']?.value).toBe('C');
    });

    it('should handle combined operations reactively', () => {
      const { data } = create({
        data: [
          { col1: 'A', col2: 1, col3: true },
          { col1: 'B', col2: 2, col3: false },
        ],
      });

      const table = new TableModel(
        [
          { id: 'col1', dataType: 'string', headerLabel: 'Column 1', accessor: (row: any) => row.col1 },
          { id: 'col2', dataType: 'number', headerLabel: 'Column 2', accessor: (row: any) => row.col2 },
          { id: 'col3', dataType: 'boolean', headerLabel: 'Column 3', accessor: (row: any) => row.col3 },
        ],
        data,
      );

      using cellsUpdates = updateCounter(() => table.cells.value);
      using specificCellUpdates = updateCounter(() => table.cells.value.grid['0,0']?.value);

      data[0].col1 = 'Updated A';
      data.push({ col1: 'C', col2: 3, col3: true });
      data.splice(1, 1);

      // Check cells map updates
      expect(cellsUpdates.count).toBe(2); // Two changes: add and remove row
      expect(Object.keys(table.cells.value.grid).length).toBe(6); // 2 rows * 3 columns

      // Check specific cell update
      expect(specificCellUpdates.count).toBe(3); // Updates for modify, add row, and remove row
      expect(table.cells.value.grid['0,0']?.value).toBe('Updated A');

      // Verify final state
      expect(Object.entries(table.cells.value.grid)).toEqual([
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
