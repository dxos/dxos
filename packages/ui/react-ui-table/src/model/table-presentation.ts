//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';

import { FormatEnum, getValue } from '@dxos/echo-schema';
import { cellClassesForFieldType, cellClassesForRowSelection, formatForDisplay } from '@dxos/react-ui-form';
import {
  type DxGridPlane,
  type DxGridPlaneCells,
  type DxGridPlaneRange,
  type DxGridCellValue,
  toPlaneCellIndex,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { VIEW_FIELD_LIMIT, type FieldType } from '@dxos/schema';

import { type TableRow, type TableModel } from './table-model';
import { tableButtons, tableControls } from '../util';

/**
 * Presentation layer for a table component, handling cell rendering and grid display logic.
 * Manages rendering of table cells, headers, selection columns, and action columns across
 * different grid planes.
 */
export class TablePresentation<T extends TableRow = TableRow> {
  constructor(
    private readonly model: TableModel<T>,
    private readonly _visibleRange = signal<DxGridPlaneRange>({
      start: { row: 0, col: 0 },
      end: { row: 0, col: 0 },
    }),
  ) {}

  public getCells(range: DxGridPlaneRange, plane: DxGridPlane): DxGridPlaneCells {
    let cells: DxGridPlaneCells;

    switch (plane) {
      case 'grid':
        this._visibleRange.value = range;
        cells = this.getMainGridCells(range);
        break;
      case 'frozenRowsStart':
        cells = this.getHeaderCells(range);
        break;
      case 'frozenColsStart':
        cells = this.getSelectionColumnCells(range);
        break;
      case 'frozenColsEnd':
        cells = this.getActionColumnCells(range);
        break;
      case 'fixedStartStart':
        cells = this.getSelectAllCell();
        break;
      case 'fixedStartEnd':
        cells = this.getNewColumnCell();
        break;
      default:
        cells = {};
    }

    if (plane === 'grid' && this.model.features.dataEditable === false) {
      Object.values(cells).forEach((cell) => {
        cell.readonly = 'text-select';
      });
    }

    return cells;
  }

  private getMainGridCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.view?.fields ?? [];

    const addCell = (obj: T, field: FieldType, colIndex: number, displayIndex: number): void => {
      const { props } = this.model.projection.getFieldProjection(field.id);

      const cell: DxGridCellValue = {
        get value() {
          const value = getValue(obj, field.path);
          if (value == null) {
            return '';
          }

          switch (props.format) {
            case FormatEnum.Boolean:
            case FormatEnum.SingleSelect:
            case FormatEnum.MultiSelect: {
              return '';
            }
            case FormatEnum.Ref: {
              if (!field.referencePath) {
                return ''; // TODO(burdon): Show error.
              }

              return getValue(value.target, field.referencePath);
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

      if (props.format === FormatEnum.Ref && props.referenceSchema) {
        const targetObj = getValue(obj, field.path)?.target;
        if (targetObj) {
          cell.accessoryHtml = tableButtons.referencedCell.render({
            targetId: targetObj.id as any as string,
            schemaId: props.referenceSchema,
          });
        }
      }

      if (props.format === FormatEnum.Boolean) {
        const value = getValue(obj, field.path);
        cell.accessoryHtml = tableControls.switch.render({
          colIndex,
          rowIndex: displayIndex,
          checked: value ?? false,
        });
        cell.readonly = 'no-text-select';
      }

      if (props.format === FormatEnum.SingleSelect) {
        const value = getValue(obj, field.path);
        const options = this.model.projection.getFieldProjection(field.id).props.options;
        if (options) {
          const option = options.find((o) => o.id === value);
          if (option) {
            cell.accessoryHtml = `<span class="dx-tag" data-hue="${option.color}">${option.title}</span>`;
          }
        }
      }

      if (props.format === FormatEnum.MultiSelect) {
        const values = getValue(obj, field.path) as string[] | undefined;
        const options = this.model.projection.getFieldProjection(field.id).props.options;
        if (options && values && values.length > 0) {
          const tags = values
            .map((value) => {
              const option = options.find((o) => o.id === value);
              if (option) {
                return `<span class="dx-tag" data-hue="${option.color}">${option.title}</span>`;
              }
              return null;
            })
            .filter(Boolean)
            .join(' ');

          if (tags) {
            cell.accessoryHtml = tags;
          }
        }
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
  }

  private getHeaderCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.view?.fields ?? [];
    for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
      const { field, props } = this.model.projection.getFieldProjection(fields[col].id);
      const sorting = this.model.sorting?.sorting;
      const direction = sorting?.fieldId === field.id ? sorting.direction : undefined;

      cells[toPlaneCellIndex({ col, row: 0 })] = {
        // TODO(burdon): Use same logic as form for fallback title.
        value: props.title ?? field.path,
        readonly: true,
        resizeHandle: 'col',
        accessoryHtml: `
          ${direction !== undefined ? tableButtons.sort.render({ fieldId: field.id, direction }) : ''}
          ${tableButtons.columnSettings.render({ fieldId: field.id })}
        `,
        className: '!bg-gridHeader',
      };
    }

    return cells;
  }

  private getSelectionColumnCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    for (let row = range.start.row; row <= range.end.row && row < this.model.getRowCount(); row++) {
      const isSelected = this.model.selection.isRowIndexSelected(row);
      const classes = cellClassesForRowSelection(isSelected);
      cells[toPlaneCellIndex({ col: 0, row })] = {
        value: '',
        readonly: 'no-text-select',
        className: classes ? mx(classes) : undefined,
        accessoryHtml: tableControls.checkbox.render({ rowIndex: row, checked: isSelected }),
      };
    }

    return cells;
  }

  private getActionColumnCells(range: DxGridPlaneRange): DxGridPlaneCells {
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
  }

  private getSelectAllCell(): DxGridPlaneCells {
    if (!this.model.features.selection.enabled || this.model.selection.selectionMode === 'single') {
      return {
        [toPlaneCellIndex({ col: 0, row: 0 })]: {
          className: '!bg-gridHeader',
          readonly: true,
          value: '',
        },
      };
    }

    return {
      [toPlaneCellIndex({ col: 0, row: 0 })]: {
        accessoryHtml: tableControls.checkbox.render({
          rowIndex: 0,
          header: true,
          checked: this.model.selection.allRowsSeleted.value,
        }),
        className: '!bg-gridHeader',
        readonly: true,
        value: '',
      },
    };
  }

  private getNewColumnCell(): DxGridPlaneCells {
    return {
      [toPlaneCellIndex({ col: 0, row: 0 })]: {
        accessoryHtml: this.model.features.schemaEditable
          ? tableButtons.addColumn.render({
              disabled: (this.model.view?.fields?.length ?? 0) >= VIEW_FIELD_LIMIT,
            })
          : undefined,
        className: '!bg-gridHeader',
        readonly: true,
        value: '',
      },
    };
  }
}
