//
// Copyright 2024 DXOS.org
//

import { computed } from '@preact/signals-core';
import { describe, it, expect } from 'vitest';

import { create } from '@dxos/echo-schema';
import { updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalRuntime } from '@dxos/echo-signals';

import { createTable, updateTable, type Table, type TableEvent } from './table';

registerSignalRuntime();

const createInitialTable = (): Table =>
  createTable(
    [
      { id: 'col1', dataType: 'string', headerLabel: 'Column 1', accessor: (row: any) => row.col1 },
      { id: 'col2', dataType: 'number', headerLabel: 'Column 2', accessor: (row: any) => row.col2 },
      { id: 'col3', dataType: 'boolean', headerLabel: 'Column 3', accessor: (row: any) => row.col3 },
    ],
    [],
  );

export const applyEvents = (events: TableEvent[]): Table => {
  const initialState = createInitialTable();
  return events.reduce((state, event) => updateTable(state, event), initialState);
};

describe('updateTable', () => {
  it('should set sorting', () => {
    const events: TableEvent[] = [{ type: 'SetSort', columnId: 'col2', direction: 'asc' }];
    const newTable = applyEvents(events);
    expect(newTable.sorting).toEqual([{ columnId: 'col2', direction: 'asc' }]);
  });

  it('should move a column', () => {
    const events: TableEvent[] = [{ type: 'MoveColumn', columnId: 'col1', newIndex: 2 }];
    const newTable = applyEvents(events);
    expect(newTable.columnOrdering).toEqual(['col2', 'col3', 'col1']);
  });

  it('should pin a row', () => {
    const events: TableEvent[] = [{ type: 'PinRow', rowIndex: 1, side: 'top' }];
    const newTable = applyEvents(events);
    expect(newTable.pinnedRows.top).toContain(1);
  });

  it('should unpin a row', () => {
    const events: TableEvent[] = [
      { type: 'PinRow', rowIndex: 1, side: 'top' },
      { type: 'UnpinRow', rowIndex: 1 },
    ];
    const newTable = applyEvents(events);
    expect(newTable.pinnedRows.top).not.toContain(1);
  });

  it('should select a row', () => {
    const events: TableEvent[] = [{ type: 'SelectRow', rowIndex: 2 }];
    const newTable = applyEvents(events);
    expect(newTable.rowSelection).toContain(2);
  });

  it('should deselect a row', () => {
    const events: TableEvent[] = [
      { type: 'SelectRow', rowIndex: 2 },
      { type: 'DeselectRow', rowIndex: 2 },
    ];
    const newTable = applyEvents(events);
    expect(newTable.rowSelection).not.toContain(2);
  });

  it('should deselect all rows', () => {
    const events: TableEvent[] = [
      { type: 'SelectRow', rowIndex: 1 },
      { type: 'SelectRow', rowIndex: 2 },
      { type: 'DeselectAllRows' },
    ];
    const newTable = applyEvents(events);
    expect(newTable.rowSelection).toHaveLength(0);
  });
});

describe('column width modification', () => {
  it('should modify an existing column width', () => {
    const events: TableEvent[] = [{ type: 'ModifyColumnWidth', columnIndex: 0, width: 120 }];
    const newTable = applyEvents(events);
    expect(newTable.columnWidths[newTable.columnOrdering[0]]).toBe(120);
  });

  it('should not affect other column widths when modifying one', () => {
    const initialTable = createInitialTable();
    const initialCol2Width = initialTable.columnWidths[initialTable.columnOrdering[1]];
    const initialCol3Width = initialTable.columnWidths[initialTable.columnOrdering[2]];
    const events: TableEvent[] = [{ type: 'ModifyColumnWidth', columnIndex: 0, width: 120 }];
    const newTable = applyEvents(events);
    expect(newTable.columnWidths[newTable.columnOrdering[1]]).toBe(initialCol2Width);
    expect(newTable.columnWidths[newTable.columnOrdering[2]]).toBe(initialCol3Width);
  });

  it('should handle multiple width modifications', () => {
    const events: TableEvent[] = [
      { type: 'ModifyColumnWidth', columnIndex: 0, width: 120 },
      { type: 'ModifyColumnWidth', columnIndex: 1, width: 80 },
      { type: 'ModifyColumnWidth', columnIndex: 2, width: 200 },
    ];
    const modifiedTable = applyEvents(events);

    expect(modifiedTable.columnWidths[modifiedTable.columnOrdering[0]]).toBe(120);
    expect(modifiedTable.columnWidths[modifiedTable.columnOrdering[1]]).toBe(80);
    expect(modifiedTable.columnWidths[modifiedTable.columnOrdering[2]]).toBe(200);
  });

  it('should allow setting width to 0', () => {
    const events: TableEvent[] = [{ type: 'ModifyColumnWidth', columnIndex: 0, width: 0 }];
    const newTable = applyEvents(events);
    expect(newTable.columnWidths[newTable.columnOrdering[0]]).toBe(0);
  });

  it('should ignore modifications for non-existent column indices', () => {
    const events: TableEvent[] = [{ type: 'ModifyColumnWidth', columnIndex: 999, width: 100 }];
    const newTable = applyEvents(events);
    expect(newTable.columnWidths).toEqual(createInitialTable().columnWidths);
  });
});

describe('signal tests', () => {
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

  it('table rows should compute correctly demonstrating nested reactive structure', () => {
    // Create initial data with two rows.
    const { data } = create({
      data: [
        { col1: 'A', col2: 1, col3: true },
        { col1: 'B', col2: 2, col3: false },
      ],
    });

    // Create table with column definitions.
    const table = createTable(
      [
        { id: 'col1', dataType: 'string', headerLabel: 'Column 1', accessor: (row: any) => row.col1 },
        { id: 'col2', dataType: 'number', headerLabel: 'Column 2', accessor: (row: any) => row.col2 },
        { id: 'col3', dataType: 'boolean', headerLabel: 'Column 3', accessor: (row: any) => row.col3 },
      ],
      data,
    );

    // Track updates to the outer computed (entire rows array).
    using outerComputedUpdates = updateCounter(() => {
      table.rows.value;
    });

    // Track updates to an inner computed (single row).
    using innerComputedUpdates = updateCounter(() => {
      table.rows.value[0].value;
    });

    // Trigger outer computed by adding a new row.
    data.push({ col1: 'C', col2: 3, col3: true });

    // Trigger inner computed by modifying existing row data.
    data[0].col1 = 'Value 1';
    data[0].col2 = 999;
    data[0].col3 = !data[0].col3;

    // Outer computed should update once for the array-level change.
    expect(outerComputedUpdates.count).toBe(1);

    // Inner computed should update for array change and each property modification.
    expect(innerComputedUpdates.count).toBe(4);

    // Verify final state of the table.
    expect(table.rows.value.map((row) => row.value)).toEqual([
      { col1: 'Value 1', col2: 999, col3: false },
      { col1: 'B', col2: 2, col3: false },
      { col1: 'C', col2: 3, col3: true },
    ]);
  });
});
