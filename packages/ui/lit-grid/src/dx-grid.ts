//
// Copyright 2024 DXOS.org
//

import { LitElement, html, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';

// eslint-disable-next-line unused-imports/no-unused-imports
import './dx-grid-axis-resize-handle';
import {
  type AxisMeta,
  type AxisSizes,
  type CellIndex,
  type CellValue,
  DxAxisResize,
  type DxAxisResizeInternal,
  DxEditRequest,
  type DxGridAxisMeta,
  type DxGridCells,
  DxGridCellsSelect,
  type DxGridFixedPlane,
  type DxGridFrozenAxes,
  type DxGridFrozenColsPlane,
  type DxGridFrozenPlane,
  type DxGridFrozenRowsPlane,
  type DxGridMode,
  type DxGridPlane,
  type DxGridPlaneCells,
  type DxGridPlaneRange,
  type DxGridPlaneRecord,
  type DxGridPointer,
  type DxGridPosition,
  type DxGridPositionNullable,
} from './types';
import { separator, toCellIndex } from './util';

/**
 * The size in pixels of the gap between cells
 */
const gap = 1;

/**
 * ResizeObserver notices even subpixel changes, only respond to changes of at least 1px.
 */
const resizeTolerance = 1;

//
// `overscan` is the number of columns or rows to render outside of the viewport
//
const overscanCol = 1;
const overscanRow = 1;

//
// `size`, when suffixed with ‘row’ or ‘col’, are limits on size applied when resizing
//
const sizeColMin = 32;
const sizeColMax = 1024;
const sizeRowMin = 16;
const sizeRowMax = 1024;

const closestAction = (target: EventTarget | null): { action: string | null; actionEl: HTMLElement | null } => {
  const actionEl: HTMLElement | null = (target as HTMLElement | null)?.closest('[data-dx-grid-action]') ?? null;
  return { actionEl, action: actionEl?.getAttribute('data-dx-grid-action') ?? null };
};

const closestCell = (target: EventTarget | null, actionEl?: HTMLElement | null): DxGridPositionNullable => {
  let cellElement = actionEl;
  if (!cellElement) {
    const { action, actionEl } = closestAction(target);
    if (action === 'cell') {
      cellElement = actionEl as HTMLElement;
    }
  }
  if (cellElement) {
    const col = parseInt(cellElement.getAttribute('aria-colindex') ?? 'never');
    const row = parseInt(cellElement.getAttribute('aria-rowindex') ?? 'never');
    const plane = (cellElement.closest('[data-dx-grid-plane]')?.getAttribute('data-dx-grid-plane') ??
      'grid') as DxGridPlane;
    return { plane, col, row };
  } else {
    return null;
  }
};

const resolveRowPlane = (plane: DxGridPlane): 'grid' | DxGridFrozenRowsPlane => {
  switch (plane) {
    case 'fixedStartStart':
    case 'fixedStartEnd':
    case 'frozenRowsStart':
      return 'frozenRowsStart';
    case 'fixedEndStart':
    case 'fixedEndEnd':
    case 'frozenRowsEnd':
      return 'frozenRowsEnd';
    default:
      return 'grid';
  }
};

const resolveColPlane = (plane: DxGridPlane): 'grid' | DxGridFrozenColsPlane => {
  switch (plane) {
    case 'fixedStartStart':
    case 'fixedEndStart':
    case 'frozenColsStart':
      return 'frozenColsStart';
    case 'fixedStartEnd':
    case 'fixedEndEnd':
    case 'frozenColsEnd':
      return 'frozenColsEnd';
    default:
      return 'grid';
  }
};

const isSameCell = (a: DxGridPositionNullable, b: DxGridPositionNullable) =>
  a &&
  b &&
  a.plane === b.plane &&
  Number.isFinite(a.col) &&
  Number.isFinite(a.row) &&
  a.col === b.col &&
  a.row === b.row;

const defaultRowSize = 32;

const defaultColSize = 180;

@customElement('dx-grid')
export class DxGrid extends LitElement {
  constructor() {
    super();
    this.addEventListener('dx-axis-resize-internal', this.handleAxisResizeInternal as EventListener);
    this.addEventListener('wheel', this.handleWheel, { passive: true });
    this.addEventListener('pointerdown', this.handlePointerDown);
    this.addEventListener('pointermove', this.handlePointerMove);
    this.addEventListener('pointerup', this.handlePointerUp);
    this.addEventListener('pointerleave', this.handlePointerUp);
    this.addEventListener('focus', this.handleFocus, { capture: true });
    this.addEventListener('blur', this.handleBlur, { capture: true });
    this.addEventListener('keydown', this.handleKeydown);
  }

  @property({ type: String })
  gridId: string = 'default-grid-id';

  @property({ type: Object })
  rowDefault: DxGridPlaneRecord<DxGridFrozenRowsPlane, AxisMeta> = {
    grid: { size: defaultRowSize },
  };

  @property({ type: Object })
  columnDefault: DxGridPlaneRecord<DxGridFrozenColsPlane, AxisMeta> = {
    grid: { size: defaultColSize },
  };

  @property({ type: Object })
  rows: DxGridAxisMeta = { grid: {} };

  @property({ type: Object })
  columns: DxGridAxisMeta = { grid: {} };

  @property({ type: Object })
  initialCells: DxGridCells = { grid: {} };

  @property({ type: String })
  mode: DxGridMode = 'browse';

  @property({ type: Number })
  limitColumns: number = Infinity;

  @property({ type: Number })
  limitRows: number = Infinity;

  @property({ type: Object })
  frozen: DxGridFrozenAxes = {};

  /**
   * When this function is defined, it is used first to try to get a value for a cell, and otherwise will fall back
   * to `cells`.
   */
  getCells: ((nextRange: DxGridPlaneRange, plane: DxGridPlane) => DxGridPlaneCells) | null = null;

  @state()
  private cells: DxGridCells = { grid: {} };

  //
  // `pos`, short for ‘position’, is the position in pixels of the viewport from the origin.
  //

  @state()
  private posInline = 0;

  @state()
  private posBlock = 0;

  //
  // `size` (when not suffixed with ‘row’ or ‘col’, see above) is the size in pixels of the viewport.
  //

  @state()
  private sizeInline = 0;

  @state()
  private sizeBlock = 0;

  //
  // `overscan` is the amount in pixels to offset the grid content due to the number of overscanned columns or rows.
  //

  @state()
  private overscanInline = 0;

  @state()
  private overscanBlock = 0;

  //
  // `bin`, not short for anything, is the range in pixels within which virtualization does not need to reassess.
  //

  @state()
  private binInlineMin = 0;

  @state()
  private binInlineMax = defaultColSize;

  @state()
  private binBlockMin = 0;

  @state()
  private binBlockMax = defaultRowSize;

  //
  // `vis`, short for ‘visible’, is the range in numeric index of the columns or rows which should be rendered within
  // the viewport. These start with naïve values that are updated before first contentful render.
  //

  @state()
  private visColMin = 0;

  @state()
  private visColMax = 1;

  @state()
  private visRowMin = 0;

  @state()
  private visRowMax = 1;

  //
  // `template` is the rendered value of `grid-{axis}-template`.
  //
  @state()
  private templateGridColumns = '0';

  @state()
  private templatefrozenColsStart = '';

  @state()
  private templatefrozenColsEnd = '';

  @state()
  private templateGridRows = '0';

  @state()
  private templatefrozenRowsStart = '';

  @state()
  private templatefrozenRowsEnd = '';

  //
  // Focus, selection, and resize states
  //

  @state()
  private pointer: DxGridPointer = null;

  @state()
  private colSizes: AxisSizes = { grid: {} };

  @state()
  private rowSizes: AxisSizes = { grid: {} };

  @state()
  private focusActive: boolean = false;

  @state()
  private focusedCell: DxGridPosition = { plane: 'grid', col: 0, row: 0 };

  @state()
  private selectionStart: DxGridPosition = { plane: 'grid', col: 0, row: 0 };

  @state()
  private selectionEnd: DxGridPosition = { plane: 'grid', col: 0, row: 0 };

  //
  // Limits
  //

  @state()
  private intrinsicInlineSize: number = Infinity;

  @state()
  private intrinsicBlockSize: number = Infinity;

  //
  // Primary pointer and keyboard handlers
  //

  private dispatchEditRequest(initialContent?: string) {
    this.snapPosToFocusedCell();
    // Without deferring, the event dispatches before `focusedCellBox` can get updated bounds of the cell, hence:
    queueMicrotask(() =>
      this.dispatchEvent(
        new DxEditRequest({
          cellIndex: toCellIndex(this.focusedCell),
          cellBox: this.focusedCellBox(),
          initialContent,
        }),
      ),
    );
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.isPrimary) {
      const { action, actionEl } = closestAction(event.target);
      if (action) {
        if (action === 'cell') {
          const cellCoords = closestCell(event.target, actionEl);
          if (cellCoords) {
            this.pointer = { state: 'selecting' };
            this.selectionStart = cellCoords;
          }
          if (this.mode === 'edit') {
            event.preventDefault();
          } else {
            if (this.focusActive && isSameCell(this.focusedCell, cellCoords)) {
              this.dispatchEditRequest();
            }
          }
        }
      }
    }
  };

  private handlePointerUp = (event: PointerEvent) => {
    const cell = closestCell(event.target);
    if (cell) {
      this.selectionEnd = cell;
      this.dispatchEvent(
        new DxGridCellsSelect({
          start: this.selectionStart,
          end: this.selectionEnd,
        }),
      );
    }
    this.pointer = null;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (this.pointer?.state === 'selecting') {
      const cell = closestCell(event.target);
      if (cell && (cell.col !== this.selectionEnd.col || cell.row !== this.selectionEnd.row)) {
        this.selectionEnd = cell;
      }
    }
  };

  private handleKeydown(event: KeyboardEvent) {
    if (this.focusActive && this.mode === 'browse') {
      // Adjust state
      switch (event.key) {
        case 'ArrowDown':
          this.focusedCell = { ...this.focusedCell, row: Math.min(this.limitRows - 1, this.focusedCell.row + 1) };
          break;
        case 'ArrowUp':
          this.focusedCell = { ...this.focusedCell, row: Math.max(0, this.focusedCell.row - 1) };
          break;
        case 'ArrowRight':
          this.focusedCell = { ...this.focusedCell, col: Math.min(this.limitColumns - 1, this.focusedCell.col + 1) };
          break;
        case 'ArrowLeft':
          this.focusedCell = { ...this.focusedCell, col: Math.max(0, this.focusedCell.col - 1) };
          break;
      }
      // Emit edit request if relevant
      switch (event.key) {
        case 'Enter':
          this.dispatchEditRequest();
          break;
        default:
          if (event.key.length === 1 && event.key.match(/\P{Cc}/u)) {
            this.dispatchEditRequest(event.key);
          }
          break;
      }
      // Handle virtualization & focus consequences
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'ArrowRight':
        case 'ArrowLeft':
          event.preventDefault();
          this.snapPosToFocusedCell();
          break;
      }
    }
  }

  //
  // Accessors
  //

  private colSize(c: number | string, plane: DxGridPlane) {
    const resolvedPlane = resolveColPlane(plane);
    return this.colSizes?.[resolvedPlane]?.[c] ?? this.columnDefault[resolvedPlane]?.size ?? defaultColSize;
  }

  private rowSize(r: number | string, plane: DxGridPlane) {
    const resolvedPlane = resolveRowPlane(plane);
    return this.rowSizes?.[resolvedPlane]?.[r] ?? this.rowDefault[resolvedPlane]?.size ?? defaultRowSize;
  }

  private cell(c: number | string, r: number | string, plane: DxGridPlane): CellValue | undefined {
    const index: CellIndex = `${c}${separator}${r}`;
    return this.cells?.[plane]?.[index] ?? this.initialCells?.[plane]?.[index];
  }

  private cellActive(c: number | string, r: number | string, plane: DxGridPlane): boolean {
    return (
      this.focusActive && this.focusedCell.plane === plane && this.focusedCell.col === c && this.focusedCell.row === r
    );
  }

  private cellSelected(c: number | string, r: number | string, plane: DxGridPlane): boolean {
    // todo(thure): restore selection
    // c >= selectColMin && c <= selectColMax && r >= selectRowMin && r <= selectRowMax;
    return false;
  }

  private focusedCellBox(): DxEditRequest['cellBox'] {
    const cellElement = this.focusedCellElement();
    const cellSize = {
      inlineSize: this.colSize(this.focusedCell.col, this.focusedCell.plane),
      blockSize: this.rowSize(this.focusedCell.row, this.focusedCell.plane),
    };
    if (!cellElement) {
      return { insetInlineStart: NaN, insetBlockStart: NaN, ...cellSize };
    }
    const contentElement = cellElement.offsetParent as HTMLElement;
    // Note that storing `offset` in state causes performance issues, so instead the transform is parsed here.
    const [_translate3d, inlineStr, blockStr] = contentElement.style.transform.split(/[()]|px,?\s?/);
    const contentOffsetInline = parseFloat(inlineStr);
    const contentOffsetBlock = parseFloat(blockStr);
    const offsetParent = contentElement.offsetParent as HTMLElement;
    return {
      insetInlineStart: cellElement.offsetLeft + contentOffsetInline + offsetParent.offsetLeft,
      insetBlockStart: cellElement.offsetTop + contentOffsetBlock + offsetParent.offsetTop,
      ...cellSize,
    };
  }

  //
  // Resize & reposition handlers, observer, ref
  //

  @state()
  private observer = new ResizeObserver((entries) => {
    const { inlineSize, blockSize } = entries?.[0]?.contentBoxSize?.[0] ?? {
      inlineSize: 0,
      blockSize: 0,
    };
    if (
      Math.abs(inlineSize - this.sizeInline) > resizeTolerance ||
      Math.abs(blockSize - this.sizeBlock) > resizeTolerance
    ) {
      // console.info('[updating bounds]', 'resize', [inlineSize - this.sizeInline, blockSize - this.sizeBlock]);
      this.sizeInline = inlineSize;
      this.sizeBlock = blockSize;
      this.updateVis();
      queueMicrotask(() => this.updatePos());
    }
  });

  private viewportRef: Ref<HTMLDivElement> = createRef();

  private maybeUpdateVis = () => {
    if (
      this.posInline >= this.binInlineMin &&
      this.posInline < this.binInlineMax &&
      this.posBlock >= this.binBlockMin &&
      this.posBlock < this.binBlockMax
    ) {
      // do nothing
    } else {
      // console.info(
      //   '[updating bounds]',
      //   'wheel',
      //   [this.binInlineMin, this.posInline, this.binInlineMax],
      //   [this.binBlockMin, this.posBlock, this.binBlockMax],
      // );
      this.updateVis();
    }
  };

  private updatePos(inline?: number, block?: number) {
    this.posInline = Math.max(0, Math.min(this.intrinsicInlineSize - this.sizeInline, inline ?? this.posInline));
    this.posBlock = Math.max(0, Math.min(this.intrinsicBlockSize - this.sizeBlock, block ?? this.posBlock));
    this.maybeUpdateVis();
  }

  private handleWheel = ({ deltaX, deltaY }: Pick<WheelEvent, 'deltaX' | 'deltaY'>) => {
    if (this.mode === 'browse') {
      this.updatePos(this.posInline + deltaX, this.posBlock + deltaY);
    }
  };

  private updateVisInline() {
    // todo: avoid starting from zero
    let colIndex = 0;
    let pxInline = this.colSize(colIndex, 'grid');

    while (pxInline < this.posInline) {
      colIndex += 1;
      pxInline += this.colSize(colIndex, 'grid') + gap;
    }

    this.visColMin = colIndex - overscanCol;

    this.binInlineMin = pxInline - this.colSize(colIndex, 'grid') - gap;
    this.binInlineMax = pxInline + gap;

    this.overscanInline =
      [...Array(overscanCol)].reduce((acc, _, c0) => {
        acc += this.colSize(this.visColMin + c0, 'grid');
        return acc;
      }, 0) +
      gap * (overscanCol - 1);

    while (pxInline < this.binInlineMax + this.sizeInline + gap) {
      colIndex += 1;
      pxInline += this.colSize(colIndex, 'grid') + gap;
    }

    this.visColMax = Math.min(this.limitColumns, colIndex + overscanCol);

    this.templateGridColumns = [...Array(this.visColMax - this.visColMin)]
      .map((_, c0) => `${this.colSize(this.visColMin + c0, 'grid')}px`)
      .join(' ');

    this.templatefrozenColsStart = [...Array(this.frozen.frozenColsStart ?? 0)]
      .map((_, c0) => `${this.colSize(c0, 'frozenColsStart')}px`)
      .join(' ');

    this.templatefrozenColsEnd = [...Array(this.frozen.frozenColsEnd ?? 0)]
      .map((_, c0) => `${this.colSize(c0, 'frozenColsEnd')}px`)
      .join(' ');
  }

  private updateVisBlock() {
    // todo: avoid starting from zero
    let rowIndex = 0;
    let pxBlock = this.rowSize(rowIndex, 'grid');

    while (pxBlock < this.posBlock) {
      rowIndex += 1;
      pxBlock += this.rowSize(rowIndex, 'grid') + gap;
    }

    this.visRowMin = rowIndex - overscanRow;

    this.binBlockMin = pxBlock - this.rowSize(rowIndex, 'grid') - gap;
    this.binBlockMax = pxBlock + gap;

    this.overscanBlock =
      [...Array(overscanRow)].reduce((acc, _, r0) => {
        acc += this.rowSize(this.visRowMin + r0, 'grid');
        return acc;
      }, 0) +
      gap * (overscanRow - 1);

    while (pxBlock < this.binBlockMax + this.sizeBlock) {
      rowIndex += 1;
      pxBlock += this.rowSize(rowIndex, 'grid') + gap;
    }

    this.visRowMax = Math.min(this.limitRows, rowIndex + overscanRow);

    this.templateGridRows = [...Array(this.visRowMax - this.visRowMin)]
      .map((_, r0) => `${this.rowSize(this.visRowMin + r0, 'grid')}px`)
      .join(' ');

    this.templatefrozenRowsStart = [...Array(this.frozen.frozenRowsStart ?? 0)]
      .map((_, r0) => `${this.rowSize(r0, 'frozenRowsStart')}px`)
      .join(' ');

    this.templatefrozenRowsEnd = [...Array(this.frozen.frozenRowsEnd ?? 0)]
      .map((_, r0) => `${this.rowSize(r0, 'frozenRowsEnd')}px`)
      .join(' ');
  }

  private updateVis() {
    this.updateVisInline();
    this.updateVisBlock();
  }

  private updateCells(includeFixed?: boolean) {
    this.cells.grid = this.getCells!(
      {
        start: { col: this.visColMin, row: this.visRowMin },
        end: { col: this.visColMax, row: this.visRowMax },
      },
      'grid',
    );
    Object.entries(this.frozen)
      .filter(([_, limit]) => limit && limit > 0)
      .forEach(([plane, limit]) => {
        this.cells[plane as DxGridFrozenPlane] = this.getCells!(
          plane.startsWith('frozenRows')
            ? {
                start: { col: this.visColMin, row: 0 },
                end: { col: this.visColMax, row: limit },
              }
            : {
                start: { col: 0, row: this.visRowMin },
                end: { col: limit, row: this.visRowMax },
              },
          plane as DxGridFrozenPlane,
        );
      });
    if (includeFixed) {
      if ((this.frozen.frozenColsStart ?? 0) > 0 && (this.frozen.frozenRowsStart ?? 0) > 0) {
        this.cells.fixedStartStart = this.getCells!(
          {
            start: { col: 0, row: 0 },
            end: { col: this.frozen.frozenColsStart!, row: this.frozen.frozenRowsStart! },
          },
          'fixedStartStart',
        );
      }
      if ((this.frozen.frozenColsEnd ?? 0) > 0 && (this.frozen.frozenRowsStart ?? 0) > 0) {
        this.cells.fixedStartEnd = this.getCells!(
          {
            start: { col: 0, row: 0 },
            end: { col: this.frozen.frozenColsEnd!, row: this.frozen.frozenRowsStart! },
          },
          'fixedStartEnd',
        );
      }
      if ((this.frozen.frozenColsStart ?? 0) > 0 && (this.frozen.frozenRowsEnd ?? 0) > 0) {
        this.cells.fixedEndStart = this.getCells!(
          {
            start: { col: 0, row: 0 },
            end: { col: this.frozen.frozenColsStart!, row: this.frozen.frozenRowsEnd! },
          },
          'fixedEndStart',
        );
      }
      if ((this.frozen.frozenColsEnd ?? 0) > 0 && (this.frozen.frozenRowsEnd ?? 0) > 0) {
        this.cells.fixedEndEnd = this.getCells!(
          {
            start: { col: 0, row: 0 },
            end: { col: this.frozen.frozenColsEnd!, row: this.frozen.frozenRowsEnd! },
          },
          'fixedEndEnd',
        );
      }
    }
  }

  // Focus handlers

  private handleFocus(event: FocusEvent) {
    const cellCoords = closestCell(event.target);
    if (cellCoords) {
      this.focusedCell = cellCoords;
      this.focusActive = true;
    }
  }

  private handleBlur(event: FocusEvent) {
    // Only unset `focusActive` if focus is not moving to an element within the grid.
    if (!event.relatedTarget || !(event.relatedTarget as HTMLElement).closest(`[data-grid="${this.gridId}"]`)) {
      this.focusActive = false;
    }
  }

  private focusedCellElement() {
    return this.viewportRef.value?.querySelector(
      `[data-dx-grid-plane=${this.focusedCell.plane}] > [aria-colindex="${this.focusedCell.col}"][aria-rowindex="${this.focusedCell.row}"]`,
    ) as HTMLElement | null;
  }

  /**
   * Moves focus to the cell with actual focus, otherwise moves focus to the viewport.
   */
  refocus(increment?: 'col' | 'row', delta: 1 | -1 = 1) {
    switch (increment) {
      case 'row':
        this.focusedCell = { ...this.focusedCell, row: this.focusedCell.row + delta };
        break;
      case 'col':
        this.focusedCell = { ...this.focusedCell, col: this.focusedCell.col + delta };
    }
    (this.focusedCell.row < this.visRowMin ||
    this.focusedCell.row > this.visRowMax ||
    this.focusedCell.col < this.visColMin ||
    this.focusedCell.col > this.visColMax
      ? this.viewportRef.value
      : this.focusedCellElement()
    )?.focus({ preventScroll: true });
    if (increment) {
      this.snapPosToFocusedCell();
    }
  }

  /**
   * Updates `pos` so that a cell in focus is fully within the viewport
   */
  snapPosToFocusedCell() {
    if (
      this.focusedCell.col < this.visColMin ||
      this.focusedCell.col > this.visColMax ||
      this.focusedCell.row < this.visRowMin ||
      this.focusedCell.row > this.visRowMax
    ) {
      // console.warn('Snapping position to a focused cell that is not already mounted is unsupported.');
    } else if (
      this.focusedCell.col > this.visColMin + overscanCol &&
      this.focusedCell.col < this.visColMax - overscanCol - 1 &&
      this.focusedCell.row > this.visRowMin + overscanRow &&
      this.focusedCell.row < this.visRowMax - overscanRow - 1
    ) {
      // console.log(
      //   '[within bounds]',
      //   this.focusedCell,
      //   [this.visColMin, this.visColMax, overscanCol],
      //   [this.visRowMin, this.visRowMax, overscanRow],
      // );
    } else {
      if (this.focusedCell.col <= this.visColMin + overscanCol) {
        this.posInline = this.binInlineMin + gap;
        this.updateVisInline();
      } else if (this.focusedCell.col >= this.visColMax - overscanCol - 1) {
        const sizeSumCol = [...Array(this.focusedCell.col - this.visColMin)].reduce((acc, _, c0) => {
          acc += this.colSize(this.visColMin + overscanCol + c0, 'grid') + gap;
          return acc;
        }, 0);
        this.posInline = Math.max(
          0,
          Math.min(
            this.intrinsicInlineSize - this.sizeInline,
            this.binInlineMin + sizeSumCol + gap * 2 - this.sizeInline,
          ),
        );
        this.updateVisInline();
      }

      if (this.focusedCell.row <= this.visRowMin + overscanRow) {
        this.posBlock = this.binBlockMin + gap;
        this.updateVisBlock();
      } else if (this.focusedCell.row >= this.visRowMax - overscanRow - 1) {
        const sizeSumRow = [...Array(this.focusedCell.row - this.visRowMin)].reduce((acc, _, r0) => {
          acc += this.rowSize(this.visRowMin + overscanRow + r0, 'grid') + gap;
          return acc;
        }, 0);
        this.posBlock = Math.max(
          0,
          Math.min(this.intrinsicBlockSize - this.sizeBlock, this.binBlockMin + sizeSumRow + gap * 2 - this.sizeBlock),
        );
        this.updateVisBlock();
      }
    }
  }

  //
  // Map scroll DOM methods to virtualized value.
  //

  override get scrollLeft() {
    return this.posInline;
  }

  override set scrollLeft(nextValue: number) {
    this.posInline = nextValue;
    this.maybeUpdateVis();
  }

  override get scrollTop() {
    return this.posBlock;
  }

  override set scrollTop(nextValue: number) {
    this.posBlock = nextValue;
    this.maybeUpdateVis();
  }

  //
  // Resize handlers
  //
  private handleAxisResizeInternal(event: DxAxisResizeInternal) {
    event.stopPropagation();
    const { axis, delta, size, index, type } = event;
    if (axis === 'col') {
      const nextSize = Math.max(sizeColMin, Math.min(sizeColMax, size + delta));
      this.colSizes = { ...this.colSizes, [index]: nextSize };
      this.updateVisInline();
      this.updateIntrinsicInlineSize();
    } else {
      const nextSize = Math.max(sizeRowMin, Math.min(sizeRowMax, size + delta));
      this.rowSizes = { ...this.rowSizes, [index]: nextSize };
      this.updateVisBlock();
      this.updateIntrinsicBlockSize();
    }
    if (type === 'dropped') {
      this.dispatchEvent(
        new DxAxisResize({
          axis,
          // todo(thure): Support other planes
          plane: 'grid',
          index,
          size: this[axis === 'col' ? 'colSize' : 'rowSize'](index, 'grid'),
        }),
      );
    }
  }

  //
  // Render and other lifecycle methods
  //

  private renderFixed(plane: DxGridFixedPlane) {
    const colPlane = resolveColPlane(plane) as DxGridFrozenPlane;
    const rowPlane = resolveRowPlane(plane) as DxGridFrozenPlane;
    const cols = this.frozen[colPlane];
    const rows = this.frozen[rowPlane];
    return (cols ?? 0) > 0 && (rows ?? 0) > 0
      ? html`<div
          role="none"
          data-dx-grid-plane=${plane}
          class="dx-grid__plane--fixed"
          style=${styleMap({
            'grid-template-columns': this[`template${colPlane}`],
            'grid-template-rows': this[`template${rowPlane}`],
          })}
        >
          ${[...Array(cols)].map((_, c) => {
            return [...Array(rows)].map((_, r) => {
              return this.renderCell(c, r, plane);
            });
          })}
        </div>`
      : null;
  }

  private renderFrozenRows(plane: DxGridFrozenRowsPlane, visibleCols: number, offsetInline: number) {
    const rowPlane = resolveRowPlane(plane) as DxGridFrozenPlane;
    const rows = this.frozen[rowPlane];
    return (rows ?? 0) > 0
      ? html`<div role="none" class="dx-grid__plane--frozen-row">
          <div
            role="none"
            data-dx-grid-plane=${plane}
            class="dx-grid__plane--frozen-row__content"
            style="transform:translate3d(${offsetInline}px,0,0);grid-template-columns:${this
              .templateGridColumns};grid-template-rows:${this[`template${rowPlane}`]}"
          >
            ${[...Array(visibleCols)].map((_, c0) => {
              return [...Array(rows)].map((_, r) => {
                const c = this.visColMin + c0;
                return this.renderCell(c, r, plane, c0, r);
              });
            })}
          </div>
        </div>`
      : null;
  }

  private renderFrozenColumns(plane: DxGridFrozenColsPlane, visibleRows: number, offsetBlock: number) {
    const colPlane = resolveColPlane(plane) as DxGridFrozenPlane;
    const cols = this.frozen[colPlane];
    return (cols ?? 0) > 0
      ? html`<div role="none" class="dx-grid__plane--frozen-col">
          <div
            role="none"
            data-dx-grid-plane=${plane}
            class="dx-grid__plane--frozen-col__content"
            style="transform:translate3d(0,${offsetBlock}px,0);grid-template-rows:${this
              .templateGridRows};grid-template-columns:${this[`template${colPlane}`]}"
          >
            ${[...Array(cols)].map((_, c) => {
              return [...Array(visibleRows)].map((_, r0) => {
                const r = this.visRowMin + r0;
                return this.renderCell(c, r, plane, c, r0);
              });
            })}
          </div>
        </div>`
      : null;
  }

  private renderCell(col: number, row: number, plane: DxGridPlane, visCol = col, visRow = row) {
    const cell = this.cell(col, row, plane);
    const active = this.cellActive(col, row, plane);
    const selected = this.cellSelected(col, row, plane);
    return html`<div
      role="gridcell"
      tabindex="0"
      ?inert=${col < 0 || row < 0}
      ?aria-selected=${selected}
      class=${cell || active
        ? (cell?.className ? cell.className + ' ' : '') + (active ? 'dx-grid__cell--active' : '')
        : nothing}
      aria-colindex=${col}
      aria-rowindex=${row}
      data-dx-grid-action="cell"
      style="grid-column:${visCol + 1};grid-row:${visRow + 1}"
    >
      ${cell?.value}
    </div>`;
  }

  override render() {
    const visibleCols = this.visColMax - this.visColMin;
    const visibleRows = this.visRowMax - this.visRowMin;
    const offsetInline = this.binInlineMin - this.posInline - this.overscanInline;
    const offsetBlock = this.binBlockMin - this.posBlock - this.overscanBlock;

    const selectColMin = Math.min(this.selectionStart.col, this.selectionEnd.col);
    const selectColMax = Math.max(this.selectionStart.col, this.selectionEnd.col);
    const selectRowMin = Math.min(this.selectionStart.row, this.selectionEnd.row);
    const selectRowMax = Math.max(this.selectionStart.row, this.selectionEnd.row);
    const selectVisible = selectColMin !== selectColMax || selectRowMin !== selectRowMax;

    return html`<div
      role="none"
      class="dx-grid"
      style=${styleMap({
        'grid-template-columns': `${this.templatefrozenColsStart ? 'min-content ' : ''}minmax(0, ${
          Number.isFinite(this.limitColumns) ? `${this.intrinsicInlineSize}px` : '1fr'
        })${this.templatefrozenColsEnd ? ' min-content' : ''}`,
        'grid-template-rows': `${this.templatefrozenRowsStart ? 'min-content ' : ''}minmax(0, ${
          Number.isFinite(this.limitRows) ? `${this.intrinsicBlockSize}px` : '1fr'
        })${this.templatefrozenRowsEnd ? ' min-content' : ''}`,
      })}
      data-grid=${this.gridId}
      data-grid-mode=${this.mode}
      ?data-grid-select=${selectVisible}
    >
      ${this.renderFixed('fixedStartStart')}${this.renderFrozenRows(
        'frozenRowsStart',
        visibleCols,
        offsetInline,
      )}${this.renderFixed('fixedStartEnd')}${this.renderFrozenColumns('frozenColsStart', visibleRows, offsetBlock)}
      <div role="grid" class="dx-grid__plane--grid" tabindex="0" ${ref(this.viewportRef)}>
        <div
          role="none"
          class="dx-grid__plane--grid__content"
          data-dx-grid-plane="grid"
          style="transform:translate3d(${offsetInline}px,${offsetBlock}px,0);grid-template-columns:${this
            .templateGridColumns};grid-template-rows:${this.templateGridRows};"
        >
          ${[...Array(visibleCols)].map((_, c0) => {
            return [...Array(visibleRows)].map((_, r0) => {
              const c = c0 + this.visColMin;
              const r = r0 + this.visRowMin;
              return this.renderCell(c, r, 'grid', c0, r0);
            });
          })}
        </div>
      </div>
      ${this.renderFrozenColumns('frozenColsEnd', visibleRows, offsetBlock)}${this.renderFixed(
        'fixedEndStart',
      )}${this.renderFrozenRows('frozenRowsEnd', visibleCols, offsetInline)}${this.renderFixed('fixedEndEnd')}
    </div>`;
  }

  private updateIntrinsicInlineSize() {
    this.intrinsicInlineSize = Number.isFinite(this.limitColumns)
      ? [...Array(this.limitColumns)].reduce((acc, _, c0) => acc + this.colSize(c0, 'grid'), 0) +
        gap * (this.limitColumns - 1)
      : Infinity;
  }

  private updateIntrinsicBlockSize() {
    this.intrinsicBlockSize = Number.isFinite(this.limitRows)
      ? [...Array(this.limitRows)].reduce((acc, _, r0) => acc + this.rowSize(r0, 'grid'), 0) +
        gap * (this.limitRows - 1)
      : Infinity;
  }

  private updateIntrinsicSizes() {
    this.updateIntrinsicInlineSize();
    this.updateIntrinsicBlockSize();
  }

  override firstUpdated() {
    if (this.getCells) {
      this.updateCells(true);
    }
    this.observer.observe(this.viewportRef.value!);
    this.colSizes = Object.entries(this.columns).reduce(
      (acc: AxisSizes, [plane, planeColMeta]) => {
        acc[plane as 'grid' | DxGridFrozenPlane] = Object.entries(planeColMeta).reduce(
          (planeAcc: Record<string, number>, [col, colMeta]) => {
            if (colMeta?.size) {
              planeAcc[col] = colMeta.size;
            }
            return planeAcc;
          },
          {},
        );
        return acc;
      },
      { grid: {} },
    );
    this.rowSizes = Object.entries(this.rows).reduce(
      (acc: AxisSizes, [plane, planeRowMeta]) => {
        acc[plane as 'grid' | DxGridFrozenPlane] = Object.entries(planeRowMeta).reduce(
          (planeAcc: Record<string, number>, [row, rowMeta]) => {
            if (rowMeta?.size) {
              planeAcc[row] = rowMeta.size;
            }
            return planeAcc;
          },
          {},
        );
        return acc;
      },
      { grid: {} },
    );
    this.updateIntrinsicSizes();
  }

  override willUpdate(changedProperties: Map<string, any>) {
    if (
      this.getCells &&
      (changedProperties.has('initialCells') ||
        changedProperties.has('visColMin') ||
        changedProperties.has('visColMax') ||
        changedProperties.has('visRowMin') ||
        changedProperties.has('visRowMax'))
    ) {
      this.updateCells();
    }
  }

  override updated(changedProperties: Map<string, any>) {
    // Update the focused element if there is a change in bounds (otherwise Lit keeps focus on the relative element).
    if (
      this.focusActive &&
      (changedProperties.has('visRowMin') || changedProperties.has('visColMin') || changedProperties.has('focusedCell'))
    ) {
      this.refocus();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // console.log('[disconnected]', this.viewportRef.value);
    // TODO(thure): Will this even work?
    if (this.viewportRef.value) {
      this.observer.unobserve(this.viewportRef.value);
    }
  }

  override createRenderRoot() {
    return this;
  }
}
