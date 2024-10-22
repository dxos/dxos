//
// Copyright 2024 DXOS.org
//

import { computed, signal, type ReadonlySignal } from '@preact/signals-core';
import sortBy from 'lodash.sortby';

import { Resource } from '@dxos/context';
import { PublicKey } from '@dxos/react-client';
import { parseValue, cellClassesForFieldType } from '@dxos/react-ui-data';
import {
  type DxGridPlaneCells,
  type DxGridCells,
  type DxGridAxisMeta,
  type DxGridCellValue,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { formatValue } from '@dxos/schema';

import { CellUpdateListener } from './update-listener';
import { fromCellKey, type GridCell, type TableType } from '../types';

export type ColumnId = string;
export type SortDirection = 'asc' | 'desc';
export type SortConfig = { columnId: ColumnId; direction: SortDirection };

export type TableModelProps = {
  table: TableType;
  data: any[];
  onCellUpdate?: (cell: GridCell) => void;
  sorting?: SortConfig[];
  pinnedRows?: { top: number[]; bottom: number[] };
  rowSelection?: number[];
};

// TODO(Zan): Is there a better place for this to live?
export const columnSettingsButtonAttr = 'data-table-column-settings-button';
const columnSettingsButtonClasses = 'ch-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-2';
const columnSettingsIcon = 'ph--caret-down--regular';
const columnSettingsButtonHtml = (columnId: string) =>
  `<button class="${columnSettingsButtonClasses}" ${columnSettingsButtonAttr}="${columnId}"><svg><use href="/icons.svg#${columnSettingsIcon}"/></svg></button>`;

export class TableModel extends Resource {
  public readonly id = `table-model-${PublicKey.random().truncate()}`;

  public readonly table: TableType;
  public readonly data: any[];

  public cells!: ReadonlySignal<DxGridCells>;
  public cellUpdateListener!: CellUpdateListener;
  public columnMeta!: ReadonlySignal<DxGridAxisMeta>;

  public pinnedRows: { top: number[]; bottom: number[] };
  public rowSelection: number[];

  public readonly sorting = signal<SortConfig | undefined>(undefined);

  /**
   * Maps display indices to data indices.
   * Used for translating between sorted/displayed order and original data order.
   * Keys are display indices, values are corresponding data indices.
   */
  private readonly displayToDataIndex: Map<number, number> = new Map();

  private readonly onCellUpdate?: (cell: GridCell) => void;

  constructor({
    table,
    data,
    onCellUpdate,
    sorting = [],
    pinnedRows = { top: [], bottom: [] },
    rowSelection = [],
  }: TableModelProps) {
    super();
    this.table = table;
    this.data = data;
    this.onCellUpdate = onCellUpdate;
    this.sorting.value = sorting[0] ?? undefined;
    this.pinnedRows = pinnedRows;
    this.rowSelection = rowSelection;
  }

  protected override async _open() {
    // Construct the header cells based on the table fields.
    const headerCells: ReadonlySignal<DxGridPlaneCells> = computed(() => {
      const fields = this.table.view?.fields ?? [];
      return Object.fromEntries(
        fields.map((field, index: number) => {
          return [
            fromCellKey({ col: index, row: 0 }),
            {
              value: field.label ?? field.path,
              resizeHandle: 'col',
              accessoryHtml: columnSettingsButtonHtml(field.id),
            },
          ];
        }),
      );
    });

    const sortedData = computed(() => {
      this.displayToDataIndex.clear();
      const sort = this.sorting.value;
      if (!sort) {
        return this.data;
      }

      const field = this.table.view?.fields.find((field) => field.id === sort.columnId);
      if (!field) {
        return this.data;
      }

      const dataWithIndices = this.data.map((item, index) => ({ item, index }));
      const sorted = sortBy(dataWithIndices, [(wrapper) => wrapper.item[field.path]]);
      if (sort.direction === 'desc') {
        sorted.reverse();
      }

      for (let displayIndex = 0; displayIndex < sorted.length; displayIndex++) {
        const { index: dataIndex } = sorted[displayIndex];
        if (displayIndex !== dataIndex) {
          this.displayToDataIndex.set(displayIndex, dataIndex);
        }
      }

      return sorted.map(({ item }) => item);
    });

    // Map the data to grid cells.
    const cellValues: ReadonlySignal<DxGridPlaneCells> = computed(() => {
      const values: DxGridPlaneCells = {};
      sortedData.value.forEach((row, displayIndex) => {
        (this.table.view?.fields ?? []).forEach((field, colIndex: number) => {
          const cellValueSignal = computed(() =>
            row[field.path] !== undefined ? formatValue(field.type, row[field.path]) : '',
          );
          const cellClasses = cellClassesForFieldType(field.type);
          const cell: DxGridCellValue = {
            get value() {
              return cellValueSignal.value;
            },
          };
          if (cellClasses) {
            cell.className = mx(cellClasses);
          }

          values[fromCellKey({ col: colIndex, row: displayIndex })] = cell;
        });
      });

      return values;
    });

    this.cells = computed(() => {
      return { grid: cellValues.value, frozenRowsStart: headerCells.value };
    });

    this.columnMeta = computed(() => {
      return {
        grid: Object.fromEntries(
          (this.table.view?.fields ?? []).map((field, index: number) => [
            index,
            { size: field.size ?? 256, resizeable: true },
          ]),
        ),
      };
    });

    this.cellUpdateListener = new CellUpdateListener(cellValues, this.onCellUpdate);
    this._ctx.onDispose(this.cellUpdateListener.dispose);
  }

  //
  // Data
  //

  public getCellData = ({ col, row }: GridCell): any => {
    const fields = this.table.view?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return undefined;
    }

    const field = fields[col];
    const dataIndex = this.displayToDataIndex.get(row) ?? row;
    return this.data[dataIndex][field.path];
  };

  public setCellData = ({ col, row }: GridCell, value: any): void => {
    const fields = this.table.view?.fields ?? [];
    if (col < 0 || col >= fields.length) {
      return;
    }

    const field = fields[col];
    const dataIndex = this.displayToDataIndex.get(row) ?? row;
    this.data[dataIndex][field.path] = parseValue(field.type, value);
  };

  //
  // Move
  //

  public moveColumn(columnId: ColumnId, newIndex: number): void {
    const fields = this.table.view?.fields ?? [];
    const currentIndex = fields.findIndex((field) => field.id === columnId);
    if (currentIndex !== -1 && this.table.view) {
      const [removed] = fields.splice(currentIndex, 1);
      fields.splice(newIndex, 0, removed);
    }
  }

  //
  // Resize
  //

  public setColumnWidth(columnIndex: number, width: number): void {
    const newWidth = Math.max(0, width);
    const field = this.table?.view?.fields[columnIndex];
    if (field) {
      field.size = newWidth;
    }
  }

  //
  // Sorting
  //

  public setSort(columnId: ColumnId, direction: SortDirection): void {
    this.sorting.value = { columnId, direction };
  }

  public clearSort(): void {
    this.sorting.value = undefined;
  }

  //
  // Pinning
  //

  // TODO(burdon): Change to setPinned(on/off).
  public pinRow(rowIndex: number, side: 'top' | 'bottom'): void {
    this.pinnedRows[side].push(rowIndex);
  }

  public unpinRow(rowIndex: number): void {
    this.pinnedRows.top = this.pinnedRows.top.filter((index: number) => index !== rowIndex);
    this.pinnedRows.bottom = this.pinnedRows.bottom.filter((index: number) => index !== rowIndex);
  }

  //
  // Selection
  //

  // TODO(burdon): Change to setSelection(on/off).
  public selectRow(rowIndex: number) {
    if (!this.rowSelection.includes(rowIndex)) {
      this.rowSelection.push(rowIndex);
    }
  }

  public deselectRow(rowIndex: number) {
    this.rowSelection = this.rowSelection.filter((index: number) => index !== rowIndex);
  }

  public deselectAllRows() {
    this.rowSelection = [];
  }
}
