//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';

import { FormatEnum, getValue } from '@dxos/echo-schema';
import { cellClassesForFieldType, cellClassesForRowSelection, formatForDisplay } from '@dxos/react-ui-form';
import {
  type DxGridPlane,
  type DxGridPlaneCells,
  toPlaneCellIndex,
  type DxGridPlaneRange,
  type DxGridCellValue,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { VIEW_FIELD_LIMIT, type FieldType } from '@dxos/schema';

import { type BaseTableRow, type TableModel } from './table-model';
import { tableButtons } from '../util';
import { tableControls } from '../util/table-controls';

export class TablePresentation<T extends BaseTableRow = { id: string }> {
  constructor(
    private readonly model: TableModel<T>,
    private readonly _visibleRange = signal<DxGridPlaneRange>({
      start: { row: 0, col: 0 },
      end: { row: 0, col: 0 },
    }),
  ) {}

  public getCells = (range: DxGridPlaneRange, plane: DxGridPlane): DxGridPlaneCells => {
    switch (plane) {
      case 'grid': {
        this._visibleRange.value = range;
        return this.getMainGridCells(range);
      }
      case 'frozenRowsStart': {
        return this.getHeaderCells(range);
      }
      case 'frozenColsStart': {
        return this.getSelectionColumnCells(range);
      }
      case 'frozenColsEnd': {
        return this.getActionColumnCells(range);
      }
      case 'fixedStartStart': {
        return this.getSelectAllCell();
      }
      case 'fixedStartEnd': {
        return this.getNewColumnCell();
      }
      default: {
        return {};
      }
    }
  };

  private getMainGridCells = (range: DxGridPlaneRange): DxGridPlaneCells => {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.table.view?.fields ?? [];

    const addCell = (obj: T, field: FieldType, colIndex: number, displayIndex: number): void => {
      const { props } = this.model.projection.getFieldProjection(field.id);

      const cell: DxGridCellValue = {
        get value() {
          const value = getValue(obj, field.path);
          if (value == null) {
            return '';
          }

          switch (props.format) {
            case FormatEnum.Ref: {
              if (!field.referencePath) {
                return ''; // TODO(burdon): Show error.
              }

              return getValue(value, field.referencePath);
            }

            default: {
              return formatForDisplay({ type: props.type, format: props.format, value });
            }
          }
        },
      };

      const classes = [];
      const formatClasses = cellClassesForFieldType({ type: props.type, format: props.format });
      if (formatClasses) {
        classes.push(formatClasses);
      }
      const rowSelectionClasses = cellClassesForRowSelection(this.model.selection.isObjectSelected(obj));
      if (rowSelectionClasses) {
        classes.push(rowSelectionClasses);
      }
      if (classes.length > 0) {
        cell.className = mx(classes.flat());
      }

      if (cell.value && props.format === FormatEnum.Ref && props.referenceSchema) {
        const targetObj = getValue(obj, field.path);
        cell.accessoryHtml = tableButtons.referencedCell.render({
          targetId: targetObj.id,
          schemaId: props.referenceSchema,
        });
      }

      const idx = toPlaneCellIndex({ col: colIndex, row: displayIndex });
      cells[idx] = cell;
    };

    for (let row = range.start.row; row <= range.end.row && row < this.model.getRowCount(); row++) {
      for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
        const field = fields[col];
        if (!field) {
          continue;
        }

        addCell(this.model.rows.value[row], field, col, row);
      }
    }

    return cells;
  };

  private getHeaderCells = (range: DxGridPlaneRange): DxGridPlaneCells => {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.table.view?.fields ?? [];
    for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
      const { field, props } = this.model.projection.getFieldProjection(fields[col].id);
      cells[toPlaneCellIndex({ col, row: 0 })] = {
        // TODO(burdon): Use same logic as form for fallback title.
        value: props.title ?? field.path,
        readonly: true,
        resizeHandle: 'col',
        accessoryHtml: tableButtons.columnSettings.render({ fieldId: field.id }),
      };
    }

    return cells;
  };

  private getSelectionColumnCells = (range: DxGridPlaneRange): DxGridPlaneCells => {
    const cells: DxGridPlaneCells = {};
    for (let row = range.start.row; row <= range.end.row && row < this.model.getRowCount(); row++) {
      const isSelected = this.model.selection.isRowIndexSelected(row);
      const classes = cellClassesForRowSelection(isSelected);
      cells[toPlaneCellIndex({ col: 0, row })] = {
        value: '',
        readonly: true,
        className: classes ? mx(classes) : undefined,
        accessoryHtml: tableControls.checkbox.render({ rowIndex: row, checked: isSelected }),
      };
    }

    return cells;
  };

  private getActionColumnCells = (range: DxGridPlaneRange): DxGridPlaneCells => {
    const cells: DxGridPlaneCells = {};
    for (let row = range.start.row; row <= range.end.row && row < this.model.getRowCount(); row++) {
      const isSelected = this.model.selection.isRowIndexSelected(row);
      const classes = cellClassesForRowSelection(isSelected);
      cells[toPlaneCellIndex({ col: 0, row })] = {
        value: '',
        readonly: true,
        className: classes ? mx(classes) : undefined,
        accessoryHtml: tableButtons.rowMenu.render({ rowIndex: row }),
      };
    }

    return cells;
  };

  private getSelectAllCell = (): DxGridPlaneCells => {
    return {
      [toPlaneCellIndex({ col: 0, row: 0 })]: {
        value: '',
        accessoryHtml: tableControls.checkbox.render({
          rowIndex: 0,
          header: true,
          checked: this.model.selection.allRowsSeleted.value,
        }),
        readonly: true,
      },
    };
  };

  private getNewColumnCell = (): DxGridPlaneCells => {
    return {
      [toPlaneCellIndex({ col: 0, row: 0 })]: {
        value: '',
        accessoryHtml: tableButtons.addColumn.render({
          disabled: (this.model.table.view?.fields?.length ?? 0) >= VIEW_FIELD_LIMIT,
        }),
        readonly: true,
      },
    };
  };
}
