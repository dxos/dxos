//
// Copyright 2024 DXOS.org
//

import { computed, type ReadonlySignal } from '@preact/signals-core';

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

import { CellUpdateListener } from './CellUpdateListener';
import { type TableType } from './types';
import { getCellKey } from './util';

export type ColumnId = string;
export type SortDirection = 'asc' | 'desc';
export type SortConfig = { columnId: ColumnId; direction: SortDirection };

export type TableModelProps = {
  table: TableType;
  data: any[];
  onCellUpdate?: (col: number, row: number) => void;
  sorting?: SortConfig[];
  pinnedRows?: { top: number[]; bottom: number[] };
  rowSelection?: number[];
};

// TODO(Zan): Is there a better place for this to live?
export const columnSettingsButtonAttr = 'data-table-column-settings-button';
const columnSettingsButtonClasses = 'ch-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-2';
const columnSettingsIcon = 'ph--caret-down--regular';
const columnSettingsButtonHtml = `<button class="${columnSettingsButtonClasses}" ${columnSettingsButtonAttr}=true><svg><use href="/icons.svg#${columnSettingsIcon}"/></svg></button>`;

export class TableModel extends Resource {
  public readonly id = `table-model-${PublicKey.random().truncate()}`;

  public cells!: ReadonlySignal<DxGridCells>;
  public cellUpdateListener!: CellUpdateListener;
  public columnMeta!: ReadonlySignal<DxGridAxisMeta>;

  public readonly table: TableType;
  public readonly data: any[];
  private onCellUpdate?: (col: number, row: number) => void;
  public sorting: SortConfig[];
  public pinnedRows: { top: number[]; bottom: number[] };
  public rowSelection: number[];

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
    this.sorting = sorting;
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
            getCellKey(index, 0),
            {
              value: field.label ?? field.path,
              resizeHandle: 'col',
              accessoryHtml: columnSettingsButtonHtml,
            },
          ];
        }),
      );
    });

    // Map the data to grid cells.
    const cellValues: ReadonlySignal<DxGridPlaneCells> = computed(() => {
      const values: DxGridPlaneCells = {};
      this.data.forEach((row, rowIndex) => {
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
          values[getCellKey(colIndex, rowIndex)] = cell;
        });
      });
      return values;
    });

    this.cells = computed(() => {
      return { grid: cellValues.value, frozenRowsStart: headerCells.value };
    });

    this.columnMeta = computed(() => {
      const headings = Object.fromEntries(
        (this.table.view?.fields ?? []).map((field, index: number) => {
          return [index, { size: field.size ?? 256, resizeable: true }];
        }),
      );
      return { grid: headings };
    });

    this.cellUpdateListener = new CellUpdateListener(cellValues, this.onCellUpdate);
    this._ctx.onDispose(this.cellUpdateListener.dispose);
  }

  public setSort(columnId: ColumnId, direction: SortDirection): void {
    this.sorting = [{ columnId, direction }];
  }

  public moveColumn(columnId: ColumnId, newIndex: number): void {
    const fields = this.table.view?.fields ?? [];
    const currentIndex = fields.findIndex((field) => field.id === columnId);
    if (currentIndex !== -1 && this.table.view) {
      const [removed] = fields.splice(currentIndex, 1);
      fields.splice(newIndex, 0, removed);
    }
  }

  public pinRow(rowIndex: number, side: 'top' | 'bottom'): void {
    this.pinnedRows[side].push(rowIndex);
  }

  public unpinRow(rowIndex: number): void {
    this.pinnedRows.top = this.pinnedRows.top.filter((index: number) => index !== rowIndex);
    this.pinnedRows.bottom = this.pinnedRows.bottom.filter((index: number) => index !== rowIndex);
  }

  public selectRow(rowIndex: number): void {
    if (!this.rowSelection.includes(rowIndex)) {
      this.rowSelection.push(rowIndex);
    }
  }

  public deselectRow(rowIndex: number): void {
    this.rowSelection = this.rowSelection.filter((index: number) => index !== rowIndex);
  }

  public deselectAllRows(): void {
    this.rowSelection = [];
  }

  public setColumnWidth(columnIndex: number, width: number): void {
    const newWidth = Math.max(0, width);
    const field = this.table?.view?.fields[columnIndex];
    if (field) {
      field.size = newWidth;
    }
  }

  public getCellData = (colIndex: number, rowIndex: number): any => {
    const fields = this.table.view?.fields ?? [];
    if (rowIndex < 0 || rowIndex >= this.data.length || colIndex < 0 || colIndex >= fields.length) {
      return undefined;
    }
    const field = fields[colIndex];
    return this.data[rowIndex][field.path];
  };

  public setCellData = (colIndex: number, rowIndex: number, value: any): void => {
    const fields = this.table.view?.fields ?? [];
    if (rowIndex < 0 || rowIndex >= this.data.length || colIndex < 0 || colIndex >= fields.length) {
      return;
    }
    const field = fields[colIndex];
    this.data[rowIndex][field.path] = parseValue(field.type, value);
  };
}
