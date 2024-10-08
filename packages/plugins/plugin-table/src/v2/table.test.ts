//
// Copyright 2024 DXOS.org
//

import { computed } from '@preact/signals-core';
import { describe, it, expect } from 'vitest';

import { create } from '@dxos/echo-schema';
import { updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';

import { createTable, updateTable, type Table, type TableEvent } from './table';

registerSignalsRuntime();

const initialTable: Table = createTable(
  [
    { id: 'col1', dataType: 'string', headerLabel: 'Column 1', accessor: (row: any) => row.col1 },
    { id: 'col2', dataType: 'number', headerLabel: 'Column 2', accessor: (row: any) => row.col2 },
    { id: 'col3', dataType: 'boolean', headerLabel: 'Column 3', accessor: (row: any) => row.col3 },
  ],
  [],
);

export const applyEvents = (initialState: Table, events: TableEvent[]): Table => {
  return events.reduce((state, event) => updateTable(state, event), initialState);
};

describe('updateTable', () => {
  it('should set sorting', () => {
    const events: TableEvent[] = [{ type: 'SetSort', columnId: 'col2', direction: 'asc' }];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.sorting).toEqual([{ columnId: 'col2', direction: 'asc' }]);
  });

  it('should move a column', () => {
    const events: TableEvent[] = [{ type: 'MoveColumn', columnId: 'col1', newIndex: 2 }];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.columnOrdering).toEqual(['col2', 'col3', 'col1']);
  });

  it('should pin a row', () => {
    const events: TableEvent[] = [{ type: 'PinRow', rowIndex: 1, side: 'top' }];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.pinnedRows.top).toContain(1);
  });

  it('should unpin a row', () => {
    const events: TableEvent[] = [
      { type: 'PinRow', rowIndex: 1, side: 'top' },
      { type: 'UnpinRow', rowIndex: 1 },
    ];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.pinnedRows.top).not.toContain(1);
  });

  it('should select a row', () => {
    const events: TableEvent[] = [{ type: 'SelectRow', rowIndex: 2 }];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.rowSelection).toContain(2);
  });

  it('should deselect a row', () => {
    const events: TableEvent[] = [
      { type: 'SelectRow', rowIndex: 2 },
      { type: 'DeselectRow', rowIndex: 2 },
    ];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.rowSelection).not.toContain(2);
  });

  it('should deselect all rows', () => {
    const events: TableEvent[] = [
      { type: 'SelectRow', rowIndex: 1 },
      { type: 'SelectRow', rowIndex: 2 },
      { type: 'DeselectAllRows' },
    ];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.rowSelection).toHaveLength(0);
  });
});

describe('column width modification', () => {
  it('should modify an existing column width', () => {
    const events: TableEvent[] = [{ type: 'ModifyColumnWidth', columnId: 'col1', width: 120 }];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.columnWidths.col1).toBe(120);
  });

  it('should not affect other column widths when modifying one', () => {
    const initialCol2Width = initialTable.columnWidths.col2;
    const initialCol3Width = initialTable.columnWidths.col3;
    const events: TableEvent[] = [{ type: 'ModifyColumnWidth', columnId: 'col1', width: 120 }];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.columnWidths.col2).toBe(initialCol2Width);
    expect(newTable.columnWidths.col3).toBe(initialCol3Width);
  });

  it('should handle multiple width modifications', () => {
    const events: TableEvent[] = [
      { type: 'ModifyColumnWidth', columnId: 'col1', width: 120 },
      { type: 'ModifyColumnWidth', columnId: 'col2', width: 80 },
      { type: 'ModifyColumnWidth', columnId: 'col3', width: 200 },
    ];
    const modifiedTable = applyEvents(initialTable, events);

    expect(modifiedTable.columnWidths).toEqual({
      col1: 120,
      col2: 80,
      col3: 200,
    });
  });

  it('should allow setting width to 0', () => {
    const events: TableEvent[] = [{ type: 'ModifyColumnWidth', columnId: 'col1', width: 0 }];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.columnWidths.col1).toBe(0);
  });

  it('should handle non-existent column ids gracefully', () => {
    const events: TableEvent[] = [{ type: 'ModifyColumnWidth', columnId: 'nonexistent', width: 100 }];
    const newTable = applyEvents(initialTable, events);
    expect(newTable.columnWidths.nonexistent).toBe(100);
    expect(newTable.columnWidths).toEqual({
      ...initialTable.columnWidths,
      nonexistent: 100,
    });
  });
});

describe('signal tests', () => {
  it('pure signals should nest', () => {
    const signal$ = create({ arr: [{ thingInside: 1 }, { thingInside: 2 }] });

    const computed$ = computed(() => {
      console.log('Outer computed');
      return signal$.arr.map((row) =>
        computed(() => {
          console.log('Inner computed');
          return row.thingInside;
        }),
      );
    });

    console.log(computed$.value.map((v) => v.value));
    signal$.arr[0].thingInside = 3;
    console.log(computed$.value.map((v) => v.value));
  });

  it('table rows should compute correctly', () => {
    const { data } = create({
      data: [
        { col1: 'A', col2: 1, col3: true },
        { col1: 'B', col2: 2, col3: false },
      ],
    });

    const table = createTable(
      [
        { id: 'col1', dataType: 'string', headerLabel: 'Column 1', accessor: (row: any) => row.col1 },
        { id: 'col2', dataType: 'number', headerLabel: 'Column 2', accessor: (row: any) => row.col2 },
        { id: 'col3', dataType: 'boolean', headerLabel: 'Column 3', accessor: (row: any) => row.col3 },
      ],
      data,
    );

    using rowsUpdates = updateCounter(() => {
      table.rows.value;
    });

    using singleRowUpdates = updateCounter(() => {
      table.rows.value[0].value;
    });

    data.push({ col1: 'C', col2: 3, col3: true });

    data[0].col1 = 'Value 1';
    data[0].col2 = 999;
    data[0].col3 = !data[0].col3;

    // Expect row updates to be 1 (push)
    expect(rowsUpdates.count).toBe(1);

    // Expect single row updates to be 4 (push, update, update, update)
    expect(singleRowUpdates.count).toBe(4);
  });
});
