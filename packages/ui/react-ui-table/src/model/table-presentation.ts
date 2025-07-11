//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';
import { isNotNullable } from 'effect/Predicate';

import { Obj } from '@dxos/echo';
import { FormatEnum, getValue, TypeEnum } from '@dxos/echo-schema';
import { cellClassesForFieldType, formatForDisplay } from '@dxos/react-ui-form';
import {
  type DxGridCellValue,
  type DxGridPlane,
  type DxGridPlaneCells,
  type DxGridPlaneRange,
  toPlaneCellIndex,
} from '@dxos/react-ui-grid';
import { mx } from '@dxos/react-ui-theme';
import { VIEW_FIELD_LIMIT, type FieldType } from '@dxos/schema';

import { type SelectionMode } from './selection-model';
import { type TableRow, type TableModel } from './table-model';
import { tableButtons, tableControls } from '../util';

/**
 * Presentation layer for a table component, handling cell rendering and grid display logic.
 * Manages rendering of table cells, headers, selection columns, and action columns across
 * different grid planes.
 */
export class TablePresentation<T extends TableRow = TableRow> {
  private fieldProjectionCache = new Map<string, ReturnType<typeof this.model.projection.getFieldProjection>>();

  constructor(
    private readonly model: TableModel<T>,
    private readonly _visibleRange = signal<DxGridPlaneRange>({
      start: { row: 0, col: 0 },
      end: { row: 0, col: 0 },
    }),
  ) {}

  public getCells(range: DxGridPlaneRange, plane: DxGridPlane): DxGridPlaneCells {
    // Clear cache at the start of each render pass
    this.fieldProjectionCache.clear();

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
      case 'frozenRowsEnd':
        cells = this.getDraftRowCells(range);
        break;
      case 'fixedEndEnd':
        cells = this.getDraftActionCells(range);
        break;
      default:
        cells = {};
    }

    if (plane === 'grid' && this.model.features.dataEditable === false) {
      Object.values<DxGridCellValue>(cells).forEach((cell) => {
        cell.readonly = 'text-select';
      });
    }

    return cells;
  }

  /**
   * Gets a field projection, using cache if available within the current render pass.
   */
  private getFieldProjection(fieldId: string) {
    let projection = this.fieldProjectionCache.get(fieldId);
    if (!projection) {
      projection = this.model.projection.getFieldProjection(fieldId);
      this.fieldProjectionCache.set(fieldId, projection);
    }
    return projection;
  }

  private createDataCell(
    cells: DxGridPlaneCells,
    obj: T,
    field: FieldType,
    colIndex: number,
    displayIndex: number,
  ): void {
    const { props } = this.getFieldProjection(field.id);

    const cell: DxGridCellValue = {
      get value() {
        const value = getValue(obj, field.path);
        if (value == null) {
          return '';
        }

        if (props.type === 'array') {
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
    const rowSelectionClasses = cellClassesForRowSelection(
      this.model.selection.isObjectSelected(obj),
      this.model.selection.selectionMode,
    );
    if (rowSelectionClasses) {
      classes.push(rowSelectionClasses);
    }
    if (classes.length > 0) {
      cell.className = mx(classes.flat());
    }

    // Arrays.
    if (props.type === TypeEnum.Array) {
      const targetArray = getValue(obj, field.path);
      if (targetArray && Array.isArray(targetArray)) {
        // TODO(ZaymonFC): For arrays of objects, objects should have a 'label' annotation on the field
        // that can be used to render tags.
        // TODO(ZaymonFC): Move to util.
        const getLabel = (value: any) => {
          // If the value is falsy, return undefined
          // If the object is an array, check for 'name' property
          // If the object is a primitive type (string, number, boolean) stringify
          // If the object is an array return 'Array'
          if (!value) {
            return undefined;
          }
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
          }
          if (Array.isArray(value)) {
            return 'Array';
          }
          if (typeof value === 'object' && value.name) {
            return value.name;
          }
          if (typeof value === 'object' && value.value) {
            return `${value.value}`;
          }
          return 'Object';
        };

        const tags = targetArray
          .map(getLabel)
          .filter(isNotNullable)
          .map((title) => {
            return `<span class="dx-tag rounded-xl" data-hue="neutral">${title}</span>`;
          })
          .join('');

        cell.accessoryHtml = `<div role='none' class="flex flex-row gap-1 overflow-x-auto">${tags}</div>`;
      }
    }

    // References.
    if (props.format === FormatEnum.Ref && props.referenceSchema) {
      const targetObj = getValue(obj, field.path)?.target;
      if (targetObj) {
        const dxn = Obj.getDXN(targetObj)?.toString();
        cell.accessoryHtml = `<dx-ref-tag refId=${dxn} class="dx-button is-6 pli-[3px] pbe-[2px] min-bs-0 absolute inline-end-1"><dx-icon icon="ph--link-simple--regular"/></dx-ref-tag>`;
      }
    }

    // Booleans.
    if (props.format === FormatEnum.Boolean) {
      const value = getValue(obj, field.path);
      cell.accessoryHtml = tableControls.switch.render({
        colIndex,
        rowIndex: displayIndex,
        checked: value ?? false,
      });
      cell.readonly = 'no-text-select';
    }

    // Single-Selects.
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

    // Multi-Selects.
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
          cell.accessoryHtml = `<div role='none' class="flex flex-row gap-1">${tags}</div>`;
        }
      }
    }

    const idx = toPlaneCellIndex({ col: colIndex, row: displayIndex });
    cells[idx] = cell;
  }

  private getMainGridCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.view?.fields ?? [];

    for (let row = range.start.row; row <= range.end.row && row < this.model.getRowCount(); row++) {
      for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
        const field = fields[col];
        if (!field) {
          continue;
        }

        this.createDataCell(cells, this.model.rows.value[row], field, col, row);
      }
    }

    return cells;
  }

  private getDraftRowCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.view?.fields ?? [];
    const draftRows = this.model.draftRows.value;

    for (let row = range.start.row; row <= range.end.row && row < draftRows.length; row++) {
      const draftRow = draftRows[row];
      for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
        const field = fields[col];
        if (!field) {
          continue;
        }

        this.createDataCell(cells, draftRow.data, field, col, row);

        if (this.model.hasDraftRowValidationError(row, field.path)) {
          const cellIndex = toPlaneCellIndex({ col, row });
          const cellValue = cells[cellIndex];
          if (cellValue) {
            const existingClasses = cellValue.className || '';
            const draftClasses = 'dx-grid__cell--flagged';
            cellValue.className = existingClasses ? `${existingClasses} ${draftClasses}` : draftClasses;
          }
        }
      }
    }

    return cells;
  }

  private getHeaderCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.view?.fields ?? [];
    for (let col = range.start.col; col <= range.end.col && col < fields.length; col++) {
      const { field, props } = this.getFieldProjection(fields[col].id);
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
        className: '!bg-toolbarSurface',
      };
    }

    return cells;
  }

  private getSelectionColumnCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    for (let row = range.start.row; row <= range.end.row && row < this.model.getRowCount(); row++) {
      const isSelected = this.model.selection.isRowIndexSelected(row);
      const classes = cellClassesForRowSelection(isSelected, this.model.selection.selectionMode);
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
      const classes = cellClassesForRowSelection(isSelected, this.model.selection.selectionMode);
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
          className: '!bg-toolbarSurface',
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
        className: '!bg-toolbarSurface',
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
        className: '!bg-toolbarSurface',
        readonly: true,
        value: '',
      },
    };
  }

  private getDraftActionCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const draftRows = this.model.draftRows.value;

    for (let row = range.start.row; row <= range.end.row && row < draftRows.length; row++) {
      const draftRow = draftRows[row];
      const disabled = !draftRow.valid;

      cells[toPlaneCellIndex({ col: 0, row })] = {
        value: '',
        readonly: true,
        accessoryHtml: tableButtons.saveDraftRow.render({ rowIndex: row, disabled }),
      };
    }

    return cells;
  }
}

export const cellClassesForRowSelection = (selected: boolean, selectionMode: SelectionMode) => {
  if (!selected) {
    if (selectionMode === 'single') {
      return ['!cursor-pointer'];
    } else {
      return undefined;
    }
  }

  switch (selectionMode) {
    case 'single':
      // TODO(ZaymonFC): @thure, do we need a grid version of 'currentRelated'?
      return ['!bg-currentRelated hover:bg-hoverSurface', '!cursor-pointer'];
    case 'multiple':
      return ['!bg-gridCellSelected'];
  }
};
