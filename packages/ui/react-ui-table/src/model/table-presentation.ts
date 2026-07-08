//
// Copyright 2024 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Predicate from 'effect/Predicate';

import { Obj, type View } from '@dxos/echo';
import { Format, TypeEnum } from '@dxos/echo/Format';
import { SchemaEx } from '@dxos/effect';
import { cellClassesForFieldType, formatForDisplay } from '@dxos/react-ui-form';
import {
  type DxGridCellValue,
  type DxGridPlane,
  type DxGridPlaneCells,
  type DxGridPlaneRange,
  toPlaneCellIndex,
} from '@dxos/react-ui-grid';
import { VIEW_FIELD_LIMIT } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';

import { tableButtons, tableControls } from '../util';
import { type SelectionMode } from './selection-model';
import { type TableModel, type TableRow } from './table-model';

/**
 * Presentation layer for a table component, handling cell rendering and grid display logic.
 * Manages rendering of table cells, headers, selection columns, and action columns across
 * different grid planes.
 */
export class TablePresentation<T extends TableRow = TableRow> {
  private readonly _registry: Registry.Registry;
  private readonly _visibleRange: Atom.Writable<DxGridPlaneRange>;
  private fieldProjectionCache = new Map<string, ReturnType<typeof this.model.projection.getFieldProjection>>();

  constructor(
    registry: Registry.Registry,
    private readonly model: TableModel<T>,
  ) {
    this._registry = registry;
    this._visibleRange = Atom.make<DxGridPlaneRange>({
      start: { row: 0, col: 0 },
      end: { row: 0, col: 0 },
    });
  }

  public getCells(range: DxGridPlaneRange, plane: DxGridPlane): DxGridPlaneCells {
    // Clear cache at the start of each render pass
    this.fieldProjectionCache.clear();

    let cells: DxGridPlaneCells;

    switch (plane) {
      case 'grid':
        this._registry.set(this._visibleRange, range);
        cells = this.getMainGridCells(range);
        break;
      case 'frozenRowsStart':
        cells = this.getHeaderCells(range);
        break;
      case 'frozenColsStart':
        cells = this.getFrozenColsStartCells(range);
        break;
      case 'frozenColsEnd':
        cells = this.getActionColumnCells(range);
        break;
      case 'fixedStartStart':
        cells = this.getFixedStartStartCells();
        break;
      case 'fixedStartEnd':
        cells = this.getNewColumnCell();
        break;
      case 'frozenRowsEnd':
        cells = this.getDraftRowCells(range);
        break;
      case 'fixedEndStart':
        cells = this.getFixedEndStartCells(range);
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
    field: View.FieldType,
    colIndex: number,
    displayIndex: number,
    plane: DxGridPlane = 'grid',
  ): void {
    const { props } = this.getFieldProjection(field.id);

    const cell: DxGridCellValue = {
      get value() {
        const value = SchemaEx.getValue(obj, field.path);
        if (value == null) {
          return '';
        }

        if (props.type === 'array') {
          return '';
        }

        switch (props.format) {
          case Format.TypeFormat.Boolean:
          case Format.TypeFormat.SingleSelect:
          case Format.TypeFormat.MultiSelect: {
            return '';
          }
          case Format.TypeFormat.Ref: {
            if (!field.referencePath) {
              return ''; // TODO(burdon): Show error.
            }

            return SchemaEx.getValue(value.target, field.referencePath);
          }

          default: {
            return formatForDisplay({ type: props.type, format: props.format, value });
          }
        }
      },
    };

    const classes = [];
    const formatClasses = cellClassesForFieldType(props);

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

    cell.className = mx(classes);

    // Arrays.
    if (props.type === TypeEnum.Array) {
      const targetArray = SchemaEx.getValue(obj, field.path);
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
          .filter(Predicate.isNotNullable)
          .map((title) => {
            return `<span class="dx-tag" data-hue="neutral">${title}</span>`;
          })
          .join('');

        cell.accessoryHtml = `<div class="flex flex-row gap-1 overflow-x-auto">${tags}</div>`;
      }
    }

    // References.
    if (props.format === Format.TypeFormat.Ref && props.referenceSchema) {
      const targetObj = SchemaEx.getValue(obj, field.path)?.target;
      if (targetObj) {
        const uri = Obj.getURI(targetObj);
        cell.accessoryHtml = `<div role="none" class="dx-grid__cell__block"><dx-anchor uri=${uri} class="dx-button w-6 aspect-square min-h-0" data-dx-grid-action="accessory"><dx-icon icon="ph--link-simple--regular"/></dx-anchor></div>`;
      }
    }

    // URLs.
    if (props.format === Format.TypeFormat.URL) {
      const value = SchemaEx.getValue(obj, field.path);
      const href = typeof value === 'string' ? safeHttpUrl(value) : undefined;
      if (href) {
        cell.accessoryHtml = `<div role="none" class="dx-grid__cell__block"><a href="${escapeHtmlAttribute(href)}" target="_blank" rel="noopener noreferrer" class="dx-button w-6 aspect-square min-h-0" data-dx-grid-action="accessory"><dx-icon icon="ph--arrow-square-out--regular"/></a></div>`;
      }
    }

    // Booleans.
    if (props.format === Format.TypeFormat.Boolean) {
      const value = SchemaEx.getValue(obj, field.path);
      cell.accessoryHtml = tableControls.switch.render({
        colIndex,
        rowIndex: displayIndex,
        plane,
        checked: value ?? false,
      });
      cell.readonly = 'no-text-select';
    }

    // Single-Selects.
    if (props.format === Format.TypeFormat.SingleSelect) {
      const value = SchemaEx.getValue(obj, field.path);
      const options = this.model.projection.getFieldProjection(field.id).props.options;
      if (options) {
        const option = options.find((o) => o.id === value);
        if (option) {
          cell.accessoryHtml = `<span class="dx-tag" data-hue="${option.color}">${option.title}</span>`;
        }
      }
    }

    // Multi-Selects.
    if (props.format === Format.TypeFormat.MultiSelect) {
      const values = SchemaEx.getValue(obj, field.path) as string[] | undefined;
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
          .join('');

        if (tags) {
          cell.accessoryHtml = tags;
        }
      }
    }

    const idx = toPlaneCellIndex({ col: colIndex, row: displayIndex });
    cells[idx] = cell;
  }

  private getMainGridCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.projection?.getFields() ?? [];
    // Pinned fields live in the frozen-column planes; the scrolling grid holds the remainder.
    const pin = this.model.pinColumns;
    const scrollingFields = fields.length - pin;

    for (let row = range.start.row; row <= range.end.row && row < this.model.getRowCount(); row++) {
      for (let col = range.start.col; col <= range.end.col && col < scrollingFields; col++) {
        const field = fields[pin + col];
        if (!field) {
          continue;
        }

        this.createDataCell(cells, this.model.getRows()[row], field, col, row, 'grid');
      }
    }

    return cells;
  }

  private getDraftRowCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.projection?.getFields() ?? [];
    const draftRows = this.model.getDraftRows();

    // Pinned fields' draft cells render in the fixedEndStart corner; the scrolling draft row holds the remainder.
    const pin = this.model.pinColumns;
    const scrollingFields = fields.length - pin;

    // Return cells of the CTA row if no draft row is active
    if (draftRows.length === 0) {
      for (let col = range.start.col; col <= range.end.col && col < scrollingFields; col++) {
        cells[toPlaneCellIndex({ col, row: 0 })] = {
          value: '',
          readonly: true,
          className: 'dx-grid__row--cta__cell',
        };
      }
    } else {
      for (let row = range.start.row; row <= range.end.row && row < draftRows.length; row++) {
        const draftRow = draftRows[row];
        for (let col = range.start.col; col <= range.end.col && col < scrollingFields; col++) {
          const field = fields[pin + col];
          if (!field) {
            continue;
          }

          this.createDraftDataCell(cells, draftRow.data, field, col, row, 'frozenRowsEnd');
        }
      }
    }

    return cells;
  }

  /**
   * Renders a draft-row data cell and applies the validation-error flag when the field is invalid.
   */
  private createDraftDataCell(
    cells: DxGridPlaneCells,
    obj: T,
    field: View.FieldType,
    planeCol: number,
    rowIndex: number,
    plane: DxGridPlane,
  ): void {
    const cellIndex = toPlaneCellIndex({ col: planeCol, row: rowIndex });
    this.createDataCell(cells, obj, field, planeCol, rowIndex, plane);

    if (this.model.hasDraftRowValidationError(rowIndex, field.path)) {
      const cellValue = cells[cellIndex];
      if (cellValue) {
        const existingClasses = cellValue.className || '';
        const draftClasses = 'dx-grid__cell--flagged';
        cellValue.className = existingClasses ? `${existingClasses} ${draftClasses}` : draftClasses;
      }
    }
  }

  private getHeaderCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const fields = this.model.projection?.getFields() ?? [];
    // Pinned fields' headers render in the fixedStartStart corner; the scrolling header holds the remainder.
    const pin = this.model.pinColumns;
    const scrollingFields = fields.length - pin;
    for (let col = range.start.col; col <= range.end.col && col < scrollingFields; col++) {
      this.createHeaderCell(cells, fields[pin + col].id, col);
    }

    return cells;
  }

  private createHeaderCell(cells: DxGridPlaneCells, fieldId: string, planeCol: number): void {
    const currentSort = this.model.getSorting();
    const { field, props } = this.model.projection.getFieldProjection(fieldId);
    const direction = currentSort?.fieldId === field.id ? currentSort.direction : undefined;

    cells[toPlaneCellIndex({ col: planeCol, row: 0 })] = {
      // TODO(burdon): Use same logic as form for fallback title.
      value: '',
      resizeHandle: 'col',
      accessoryHtml: `
        <span class="grow min-w-0 truncate">${props.title ?? field.path}</span>
        ${direction !== undefined ? tableButtons.sort.render({ fieldId: field.id, direction }) : ''}
        ${tableButtons.columnSettings.render({ fieldId: field.id })}
      `,
      className: 'bg-axis-surface! text-axis-text! [&>div]:flex [&>div]:items-stretch',
    };
  }

  /**
   * Renders the frozenColsStart plane: the selection column (if enabled) followed by the pinned data columns.
   */
  private getFrozenColsStartCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const selectionColumns = this.model.selectionColumns;
    const fields = this.model.projection?.getFields() ?? [];
    const pin = this.model.pinColumns;

    for (let row = range.start.row; row <= range.end.row && row < this.model.getRowCount(); row++) {
      if (selectionColumns > 0) {
        const isSelected = this.model.selection.isRowIndexSelected(row);
        const classes = cellClassesForRowSelection(isSelected, this.model.selection.selectionMode);
        cells[toPlaneCellIndex({ col: 0, row })] = {
          value: '',
          readonly: 'no-text-select',
          className: classes ? mx(classes) : undefined,
          accessoryHtml: tableControls.checkbox.render({ rowIndex: row, checked: isSelected }),
        };
      }

      for (let dataCol = 0; dataCol < pin; dataCol++) {
        const field = fields[dataCol];
        if (!field) {
          continue;
        }
        this.createDataCell(
          cells,
          this.model.getRows()[row],
          field,
          selectionColumns + dataCol,
          row,
          'frozenColsStart',
        );
      }
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

  /**
   * Renders the fixedStartStart corner (frozen header row x frozen columns): the select-all cell (if the
   * selection column is enabled) followed by the pinned columns' header cells.
   */
  private getFixedStartStartCells(): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const selectionColumns = this.model.selectionColumns;

    if (selectionColumns > 0) {
      const showSelectAll = this.model.features.selection.enabled && this.model.selection.selectionMode !== 'single';
      cells[toPlaneCellIndex({ col: 0, row: 0 })] = {
        accessoryHtml: showSelectAll
          ? tableControls.checkbox.render({
              rowIndex: 0,
              header: true,
              checked: this.model.selection.allRowsSelected,
            })
          : undefined,
        className: 'bg-axis-surface!',
        readonly: true,
        value: '',
      };
    }

    const fields = this.model.projection?.getFields() ?? [];
    const pin = this.model.pinColumns;
    for (let dataCol = 0; dataCol < pin; dataCol++) {
      const field = fields[dataCol];
      if (!field) {
        continue;
      }
      this.createHeaderCell(cells, field.id, selectionColumns + dataCol);
    }

    return cells;
  }

  private getNewColumnCell(): DxGridPlaneCells {
    return {
      [toPlaneCellIndex({ col: 0, row: 0 })]: {
        accessoryHtml: this.model.features.schemaEditable
          ? tableButtons.addColumn.render({
              disabled: (this.model.projection?.getFields()?.length ?? 0) >= VIEW_FIELD_LIMIT,
            })
          : undefined,
        className: 'bg-axis-surface!',
        readonly: true,
        value: '',
      },
    };
  }

  private getDraftActionCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const draftRows = this.model.getDraftRows();

    // Return cells of the CTA row if no draft row is active
    if (draftRows.length === 0) {
      cells[toPlaneCellIndex({ col: 0, row: 0 })] = {
        value: '',
        className: 'dx-grid__row--cta__cell',
        readonly: true,
      };
    } else {
      for (let row = range.start.row; row <= range.end.row && row < draftRows.length; row++) {
        const draftRow = draftRows[row];
        const disabled = !draftRow.valid;

        cells[toPlaneCellIndex({ col: 0, row })] = {
          value: '',
          readonly: true,
          accessoryHtml: tableButtons.saveDraftRow.render({ rowIndex: row, disabled }),
        };
      }
    }

    return cells;
  }

  /**
   * Renders the fixedEndStart corner (draft row x frozen columns): the draft "+" icon (if the selection
   * column is enabled) followed by the pinned columns' draft cells.
   */
  private getFixedEndStartCells(range: DxGridPlaneRange): DxGridPlaneCells {
    const cells: DxGridPlaneCells = {};
    const draftRows = this.model.getDraftRows();
    const selectionColumns = this.model.selectionColumns;
    const fields = this.model.projection?.getFields() ?? [];
    const pin = this.model.pinColumns;

    for (let row = range.start.row; row <= range.end.row; row++) {
      if (selectionColumns > 0) {
        cells[toPlaneCellIndex({ col: 0, row })] = {
          value: '',
          readonly: true,
          accessoryHtml:
            '<div role="none" class="dx-grid__cell__block"><dx-icon icon="ph--plus--regular" class="contents"></dx-icon></div>',
          className: mx(draftRows.length < 1 && 'dx-grid__row--cta__cell'),
        };
      }

      for (let dataCol = 0; dataCol < pin; dataCol++) {
        const field = fields[dataCol];
        if (!field) {
          continue;
        }
        const planeCol = selectionColumns + dataCol;
        if (draftRows.length === 0) {
          cells[toPlaneCellIndex({ col: planeCol, row })] = {
            value: '',
            readonly: true,
            className: 'dx-grid__row--cta__cell',
          };
        } else if (row < draftRows.length) {
          this.createDraftDataCell(cells, draftRows[row].data, field, planeCol, row, 'fixedEndStart');
        }
      }
    }

    return cells;
  }
}

/**
 * Parses a cell value as an HTTP(S) URL, returning the normalized href or `undefined`.
 * Restricting to http/https keeps `javascript:`/`data:` URLs out of the rendered anchor.
 */
const safeHttpUrl = (value: string): string | undefined => {
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Escapes a string for safe interpolation into a double-quoted HTML attribute, since
 * `accessoryHtml` is injected into the grid via `unsafeStatic`.
 */
const escapeHtmlAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const cellClassesForRowSelection = (selected: boolean, selectionMode: SelectionMode) => {
  if (!selected) {
    if (selectionMode === 'single') {
      return ['cursor-pointer!'];
    } else {
      return undefined;
    }
  }

  switch (selectionMode) {
    case 'single':
      return ['dx-grid__cell--no-focus-unfurl bg-current-surface! hover:bg-hover-surface cursor-pointer!'];
    case 'multiple':
      return ['bg-grid-cell-selected!'];
  }
};
