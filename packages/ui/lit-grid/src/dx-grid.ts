//
// Copyright 2024 DXOS.org
//

import { LitElement, html, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';
import { unsafeStatic, html as staticHtml } from 'lit/static-html.js';

// eslint-disable-next-line unused-imports/no-unused-imports
import './dx-grid-axis-resize-handle';
import {
  type DxGridAxisMetaProps,
  type DxGridAxisSizes,
  type DxGridCellIndex,
  type DxGridCellValue,
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
  type DxGridAxis,
  type DxGridSelectionProps,
  type DxGridAnnotatedWheelEvent,
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

/**
 * The amount of pixels the primary pointer has to move after PointerDown to engage in selection.
 */
const selectTolerance = 4;

//
// `overscan` is the number of columns or rows to render outside of the viewport
//
const overscanCol = 1;
const overscanRow = 1;

//
// `defaultSize`, the final fallbacks
//
const defaultSizeRow = 32;
const defaultSizeCol = 180;

//
// `size`, when suffixed with ‘row’ or ‘col’, are limits on size applied when resizing
//
const sizeColMin = 32;
const sizeColMax = 1024;
const sizeRowMin = 32;
const sizeRowMax = 1024;

const shouldSelect = (pointer: DxGridPointer, { pageX, pageY }: PointerEvent) => {
  if (pointer?.state === 'maybeSelecting') {
    return Math.hypot(Math.abs(pointer.pageX - pageX), Math.abs(pointer.pageY - pageY)) >= selectTolerance;
  } else {
    return false;
  }
};

const selectionProps = (selectionStart: DxGridPosition, selectionEnd: DxGridPosition): DxGridSelectionProps => {
  const colMin = Math.min(selectionStart.col, selectionEnd.col);
  const colMax = Math.max(selectionStart.col, selectionEnd.col);
  const rowMin = Math.min(selectionStart.row, selectionEnd.row);
  const rowMax = Math.max(selectionStart.row, selectionEnd.row);
  const plane = selectionStart.plane;
  const visible = colMin !== colMax || rowMin !== rowMax;
  return { colMin, colMax, rowMin, rowMax, plane, visible };
};

const cellSelected = (col: number, row: number, plane: DxGridPlane, selection: DxGridSelectionProps): boolean => {
  return (
    plane === selection.plane &&
    col >= selection.colMin &&
    col <= selection.colMax &&
    row >= selection.rowMin &&
    row <= selection.rowMax
  );
};

const closestAction = (target: EventTarget | null): { action: string | null; actionEl: HTMLElement | null } => {
  const actionEl: HTMLElement | null = (target as HTMLElement | null)?.closest('[data-dx-grid-action]') ?? null;
  return { actionEl, action: actionEl?.getAttribute('data-dx-grid-action') ?? null };
};

export const closestCell = (target: EventTarget | null, actionEl?: HTMLElement | null): DxGridPositionNullable => {
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

const resolveFrozenPlane = (axis: DxGridAxis, cellPlane: DxGridPlane): 'grid' | DxGridFrozenPlane => {
  switch (cellPlane) {
    case 'fixedStartStart':
      return axis === 'col' ? 'frozenColsStart' : 'frozenRowsStart';
    case 'fixedStartEnd':
      return axis === 'col' ? 'frozenColsEnd' : 'frozenRowsStart';
    case 'fixedEndStart':
      return axis === 'col' ? 'frozenColsStart' : 'frozenRowsEnd';
    case 'fixedEndEnd':
      return axis === 'col' ? 'frozenColsEnd' : 'frozenRowsEnd';
    case 'frozenColsStart':
    case 'frozenColsEnd':
      return axis === 'col' ? cellPlane : 'grid';
    case 'frozenRowsStart':
    case 'frozenRowsEnd':
      return axis === 'row' ? cellPlane : 'grid';
    default:
      return cellPlane;
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

@customElement('dx-grid')
export class DxGrid extends LitElement {
  constructor() {
    super();
    // Wheel, top-level and element-level
    document.defaultView?.addEventListener('wheel', this.handleTopLevelWheel, { passive: false });
    this.addEventListener('wheel', this.handleWheel);
    // Custom event(s)
    this.addEventListener('dx-axis-resize-internal', this.handleAxisResizeInternal as EventListener);
    // Standard events
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
  rowDefault: DxGridPlaneRecord<DxGridFrozenRowsPlane, DxGridAxisMetaProps> = {
    grid: { size: defaultSizeRow },
  };

  @property({ type: Object })
  columnDefault: DxGridPlaneRecord<DxGridFrozenColsPlane, DxGridAxisMetaProps> = {
    grid: { size: defaultSizeCol },
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

  @property({ type: String })
  overscroll: 'inline' | 'block' | undefined = undefined;

  @property({ type: String })
  activeRefs = '';

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
  private binInlineMax = defaultSizeCol;

  @state()
  private binBlockMin = 0;

  @state()
  private binBlockMax = defaultSizeRow;

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
  private colSizes: DxGridAxisSizes = { grid: {} };

  @state()
  private rowSizes: DxGridAxisSizes = { grid: {} };

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
    if (!this.cellReadonly(this.focusedCell.col, this.focusedCell.row, this.focusedCell.plane)) {
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
  }

  private dispatchSelectionChange() {
    return this.dispatchEvent(
      new DxGridCellsSelect({
        start: this.selectionStart,
        end: this.selectionEnd,
      }),
    );
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.isPrimary) {
      const { action, actionEl } = closestAction(event.target);
      if (action && action === 'cell') {
        if (event.shiftKey) {
          // Prevent focus moving so the pointerup handler can move selectionEnd.
          event.preventDefault();
        } else {
          const cellCoords = closestCell(event.target, actionEl);
          if (cellCoords) {
            this.pointer = { state: 'maybeSelecting', pageX: event.pageX, pageY: event.pageY };
            this.selectionStart = cellCoords;
            this.selectionEnd = cellCoords;
            this.dispatchSelectionChange();
          }
          if (this.mode === 'edit') {
            // Prevent focus moving when editing.
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
      this.setSelectionEnd(cell);
    }
    this.pointer = null;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (shouldSelect(this.pointer, event)) {
      this.pointer = { state: 'selecting' };
    } else if (this.pointer?.state === 'selecting') {
      const cell = closestCell(event.target);
      if (
        cell &&
        cell.plane === this.selectionStart.plane &&
        (cell.col !== this.selectionEnd.col || cell.row !== this.selectionEnd.row)
      ) {
        this.setSelectionEnd(cell);
      }
    }
  };

  /**
   * Increments focus among all theoretically possible cells in a plane, cycling as tab would but accounting for the
   * theoretical bounds of the grid plane (handling infinite planes heuristically).
   */
  private incrementFocusWithinPlane(reverse?: boolean) {
    const colPlane = resolveColPlane(this.focusedCell.plane);
    const rowPlane = resolveRowPlane(this.focusedCell.plane);
    const colMax = (colPlane === 'grid' ? this.limitColumns : this.frozen[colPlane]!) - 1;
    const rowMax = (rowPlane === 'grid' ? this.limitRows : this.frozen[rowPlane]!) - 1;
    if (reverse ? this.focusedCell.col - 1 < 0 : this.focusedCell.col + 1 > colMax) {
      if (reverse ? this.focusedCell.row - 1 < 0 : this.focusedCell.row + 1 > rowMax) {
        this.setFocusedCell({
          plane: this.focusedCell.plane,
          row: reverse && Number.isFinite(rowMax) ? rowMax : 0,
          col: reverse && Number.isFinite(colMax) ? colMax : 0,
        });
      } else {
        this.setFocusedCell({
          plane: this.focusedCell.plane,
          row: this.focusedCell.row + (reverse ? -1 : 1),
          col: reverse && Number.isFinite(colMax) ? colMax : 0,
        });
      }
    } else {
      this.setFocusedCell({ ...this.focusedCell, col: this.focusedCell.col + (reverse ? -1 : 1) });
    }
  }

  /**
   * Increments focus in a specific direction without cycling.
   */
  private moveFocusOrSelectionEndWithinPlane(deltaCol: number, deltaRow: number, selectionEnd?: boolean) {
    const current = selectionEnd ? this.selectionEnd : this.focusedCell;

    const colPlane = resolveColPlane(current.plane);
    const colMax = (colPlane === 'grid' ? this.limitColumns : this.frozen[colPlane]!) - 1;
    const nextCol = Math.max(0, Math.min(colMax, current.col + deltaCol));

    const rowPlane = resolveRowPlane(current.plane);
    const rowMax = (rowPlane === 'grid' ? this.limitRows : this.frozen[rowPlane]!) - 1;
    const nextRow = Math.max(0, Math.min(rowMax, current.row + deltaRow));

    if (selectionEnd) {
      this.setSelectionEnd({ ...this.selectionEnd, col: nextCol, row: nextRow });
    } else {
      this.setFocusedCell({ ...this.focusedCell, row: nextRow, col: nextCol });
    }
  }

  private handleKeydown(event: KeyboardEvent) {
    if (this.focusActive && this.mode === 'browse') {
      // Adjust state
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.moveFocusOrSelectionEndWithinPlane(0, 1, event.shiftKey);
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.moveFocusOrSelectionEndWithinPlane(0, -1, event.shiftKey);
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.moveFocusOrSelectionEndWithinPlane(1, 0, event.shiftKey);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          this.moveFocusOrSelectionEndWithinPlane(-1, 0, event.shiftKey);
          break;
        case 'Tab':
          event.preventDefault();
          this.incrementFocusWithinPlane(event.shiftKey);
          break;
        case 'Escape':
          // Handle escape if selection is a superset of the focused cell.
          if (this.selectionStart.col !== this.selectionEnd.col || this.selectionStart.row !== this.selectionEnd.row) {
            event.preventDefault();
            this.selectionStart = this.focusedCell;
            this.selectionEnd = this.focusedCell;
            this.dispatchSelectionChange();
          }
          break;
        case 'Enter':
          this.dispatchEditRequest();
          break;
        default:
          if (event.key.length === 1 && event.key.match(/\P{Cc}/u) && !(event.metaKey || event.ctrlKey)) {
            this.dispatchEditRequest(event.key);
          }
          break;
      }
    }
  }

  //
  // Accessors
  //

  private colSize(c: number | string, plane: DxGridPlane) {
    const resolvedPlane = resolveColPlane(plane);
    return this.colSizes?.[resolvedPlane]?.[c] ?? this.columnDefault[resolvedPlane]?.size ?? defaultSizeCol;
  }

  private rowSize(r: number | string, plane: DxGridPlane) {
    const resolvedPlane = resolveRowPlane(plane);
    return this.rowSizes?.[resolvedPlane]?.[r] ?? this.rowDefault[resolvedPlane]?.size ?? defaultSizeRow;
  }

  private cell(c: number | string, r: number | string, plane: DxGridPlane): DxGridCellValue | undefined {
    const index: DxGridCellIndex = `${c}${separator}${r}`;
    return this.cells?.[plane]?.[index] ?? this.initialCells?.[plane]?.[index];
  }

  private cellActive(c: number | string, r: number | string, plane: DxGridPlane): boolean {
    return (
      this.focusActive && this.focusedCell.plane === plane && this.focusedCell.col === c && this.focusedCell.row === r
    );
  }

  private setFocusedCell(nextCoords: DxGridPosition) {
    if (
      this.focusedCell.plane !== nextCoords.plane ||
      this.focusedCell.col !== nextCoords.col ||
      this.focusedCell.row !== nextCoords.row
    ) {
      this.focusedCell = nextCoords;
      this.selectionStart = nextCoords;
      this.selectionEnd = nextCoords;
      this.snapPosToFocusedCell();
      this.dispatchSelectionChange();
    }
  }

  private setSelectionEnd(nextCoords: DxGridPosition) {
    if (
      this.selectionEnd.plane !== nextCoords.plane ||
      this.selectionEnd.col !== nextCoords.col ||
      this.selectionEnd.row !== nextCoords.row
    ) {
      this.selectionEnd = nextCoords;
      this.dispatchSelectionChange();
    }
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

  private maybeUpdateVisInline = () => {
    if (this.posInline < this.binInlineMin || this.posInline >= this.binInlineMax) {
      this.updateVisInline();
    }
  };

  private maybeUpdateVisBlock = () => {
    if (this.posBlock < this.binBlockMin || this.posBlock >= this.binBlockMax) {
      this.updateVisBlock();
    }
  };

  private maxPosInline() {
    return this.intrinsicInlineSize - this.sizeInline;
  }

  private maxPosBlock() {
    return this.intrinsicBlockSize - this.sizeBlock;
  }

  private updatePosInline(inline?: number, maxInline: number = this.maxPosInline()) {
    this.posInline = Math.max(0, Math.min(maxInline, inline ?? this.posInline));
    this.maybeUpdateVisInline();
  }

  private updatePosBlock(block?: number, maxBlock: number = this.maxPosBlock()) {
    this.posBlock = Math.max(0, Math.min(maxBlock, block ?? this.posBlock));
    this.maybeUpdateVisBlock();
  }

  private updatePos(inline?: number, block?: number, maxInline?: number, maxBlock?: number) {
    this.updatePosInline(inline, maxInline);
    this.updatePosBlock(block, maxBlock);
  }

  private handleTopLevelWheel = (event: DxGridAnnotatedWheelEvent) => {
    if (
      (Number.isFinite(event.overscrollInline) && this.overscroll === 'inline' && event.overscrollInline === 0) ||
      (Number.isFinite(event.overscrollBlock) && this.overscroll === 'block' && event.overscrollBlock === 0)
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private handleWheel = (event: DxGridAnnotatedWheelEvent) => {
    if (this.mode === 'browse') {
      const nextPosInline = this.posInline + event.deltaX;
      const nextPosBlock = this.posBlock + event.deltaY;
      const maxPosInline = this.maxPosInline();
      const maxPosBlock = this.maxPosBlock();
      this.updatePos(nextPosInline, nextPosBlock, maxPosInline, maxPosBlock);
      event.overscrollInline =
        nextPosInline <= 0 ? nextPosInline : nextPosInline > maxPosInline ? nextPosInline - maxPosInline : 0;
      event.overscrollBlock =
        nextPosBlock <= 0 ? nextPosBlock : nextPosBlock > maxPosBlock ? nextPosBlock - maxPosBlock : 0;
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

    while (pxInline < this.binInlineMax + this.sizeInline - gap * 2) {
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

    while (pxBlock < this.binBlockMax + this.sizeBlock - gap * 2) {
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

  setFocus(coords: DxGridPosition, snap = true) {
    this.setFocusedCell(coords);
    this.focusActive = true;
    if (snap) {
      this.snapPosToFocusedCell();
    }
  }

  private handleFocus(event: FocusEvent) {
    const cellCoords = closestCell(event.target);
    if (cellCoords) {
      this.focusActive = true;
      this.setFocusedCell(cellCoords);
    }
  }

  private handleBlur(event: FocusEvent) {
    // Only unset `focusActive` if focus is not moving to an element within the grid.
    if (!event.relatedTarget || !(event.relatedTarget as HTMLElement).closest(`[data-grid="${this.gridId}"]`)) {
      this.focusActive = false;
    }
  }

  private focusedCellQuery() {
    return `[data-dx-grid-plane=${this.focusedCell.plane}] > [aria-colindex="${this.focusedCell.col}"][aria-rowindex="${this.focusedCell.row}"]`;
  }

  private focusedCellElement() {
    return this.viewportRef.value?.querySelector(this.focusedCellQuery()) as HTMLElement | null;
  }

  //
  // `outOfVis` returns by how many rows/cols the focused cell is outside of the `vis` range for an axis, inset by a
  // `delta`, otherwise zero if it is within that range.
  //

  private focusedCellRowOutOfVis(minDelta = 0, maxDelta = minDelta) {
    return this.focusedCell.row <= this.visRowMin + minDelta
      ? this.focusedCell.row - (this.visRowMin + minDelta)
      : this.focusedCell.row >= this.visRowMax - maxDelta
        ? -(this.focusedCell.row - this.visRowMax - maxDelta)
        : 0;
  }

  private focusedCellColOutOfVis(minDelta = 0, maxDelta = minDelta) {
    return this.focusedCell.col <= this.visColMin + minDelta
      ? this.focusedCell.col - (this.visColMin + minDelta)
      : this.focusedCell.col >= this.visColMax - maxDelta
        ? -(this.focusedCell.col - this.visColMax - maxDelta)
        : 0;
  }

  private focusedCellOutOfVis(colDelta = 0, rowDelta = colDelta): { col: number; row: number } {
    switch (this.focusedCell.plane) {
      case 'grid':
        return { row: this.focusedCellRowOutOfVis(rowDelta), col: this.focusedCellColOutOfVis(colDelta) };
      case 'frozenRowsStart':
      case 'frozenRowsEnd':
        return { col: this.focusedCellColOutOfVis(colDelta), row: 0 };
      case 'frozenColsStart':
      case 'frozenColsEnd':
        return { col: 0, row: this.focusedCellRowOutOfVis(rowDelta) };
      default:
        return { col: 0, row: 0 };
    }
  }

  /**
   * Moves focus to the cell with actual focus, otherwise moves focus to the viewport.
   */
  refocus(increment?: 'col' | 'row', delta: 1 | -1 = 1) {
    if (increment) {
      switch (increment) {
        case 'col': {
          this.focusedCell.col += delta;
          break;
        }
        case 'row': {
          this.focusedCell.row += delta;
          break;
        }
      }
      this.snapPosToFocusedCell();
    }

    queueMicrotask(() => {
      const outOfVis = this.focusedCellOutOfVis();
      const cellVisible = outOfVis.col === 0 && outOfVis.row === 0;
      if (cellVisible) {
        const cellElement = this.focusedCellElement();
        if (cellElement && cellElement !== document.activeElement) {
          cellElement.focus({ preventScroll: true });
        }
      } else {
        this.viewportRef.value?.focus({ preventScroll: true });
      }
    });
  }

  private findPosInlineFromVisColMin(deltaCols: number) {
    return [...Array(deltaCols)].reduce(
      (acc, _, c0) => acc - this.colSize(this.visColMin - c0, 'grid') - gap,
      this.binInlineMin + gap,
    );
  }

  private findPosBlockFromVisRowMin(deltaRows: number) {
    return [...Array(deltaRows)].reduce(
      (acc, _, r0) => acc - this.rowSize(this.visRowMin - r0, 'grid') - gap,
      this.binBlockMin + gap,
    );
  }

  /**
   * Updates `pos` so that a cell in focus is fully within the viewport
   */
  snapPosToFocusedCell() {
    const outOfVis = this.focusedCellOutOfVis(overscanCol, overscanRow);
    if (outOfVis.col < 0) {
      this.posInline = this.findPosInlineFromVisColMin(-outOfVis.col);
      this.updateVisInline();
    } else if (outOfVis.col > 0) {
      const sizeSumCol = [...Array(this.focusedCell.col - this.visColMin)].reduce((acc, _, c0) => {
        acc += this.colSize(this.visColMin + overscanCol + c0, 'grid') + gap;
        return acc;
      }, 0);
      this.posInline = Math.max(
        0,
        Math.min(this.intrinsicInlineSize - this.sizeInline, this.binInlineMin + sizeSumCol - this.sizeInline),
      );
      this.updateVisInline();
    }

    if (outOfVis.row < 0) {
      this.posBlock = this.findPosBlockFromVisRowMin(-outOfVis.row);
      this.updateVisBlock();
    } else if (outOfVis.row > 0) {
      const sizeSumRow = [...Array(this.focusedCell.row - this.visRowMin)].reduce((acc, _, r0) => {
        acc += this.rowSize(this.visRowMin + overscanRow + r0, 'grid') + gap;
        return acc;
      }, 0);
      this.posBlock = Math.max(
        0,
        Math.min(this.intrinsicBlockSize - this.sizeBlock, this.binBlockMin + sizeSumRow - this.sizeBlock),
      );
      this.updateVisBlock();
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
    this.maybeUpdateVisInline();
  }

  override get scrollTop() {
    return this.posBlock;
  }

  override set scrollTop(nextValue: number) {
    this.posBlock = nextValue;
    this.maybeUpdateVisBlock();
  }

  //
  // Resize handlers
  //

  private axisResizeable(plane: 'grid' | DxGridFrozenPlane, axis: DxGridAxis, index: number | string) {
    return axis === 'col'
      ? !!(this.columns[plane]?.[index]?.resizeable ?? this.columnDefault[plane as DxGridFrozenColsPlane]?.resizeable)
      : !!(this.rows[plane]?.[index]?.resizeable ?? this.rowDefault[plane as DxGridFrozenRowsPlane]?.resizeable);
  }

  private handleAxisResizeInternal(event: DxAxisResizeInternal) {
    event.stopPropagation();
    const { plane, axis, delta, size, index, state } = event;
    if (axis === 'col') {
      const nextSize = Math.max(sizeColMin, Math.min(sizeColMax, size + delta));
      this.colSizes = { ...this.colSizes, [plane]: { ...this.colSizes[plane], [index]: nextSize } };
      this.updateVisInline();
      this.updateIntrinsicInlineSize();
    } else {
      const nextSize = Math.max(sizeRowMin, Math.min(sizeRowMax, size + delta));
      this.rowSizes = { ...this.colSizes, [plane]: { ...this.rowSizes[plane], [index]: nextSize } };
      this.updateVisBlock();
      this.updateIntrinsicBlockSize();
    }
    if (state === 'dropped') {
      this.dispatchEvent(
        new DxAxisResize({
          plane,
          axis,
          index,
          size: this[`${axis}Size`](index, plane),
        }),
      );
    }
  }

  //
  // Render and other lifecycle methods
  //

  private renderFixed(plane: DxGridFixedPlane, selection: DxGridSelectionProps) {
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
          ${[...Array(rows)].map((_, r) => {
            return [...Array(cols)].map((_, c) => {
              return this.renderCell(c, r, plane, cellSelected(c, r, plane, selection));
            });
          })}
        </div>`
      : null;
  }

  private renderFrozenRows(
    plane: DxGridFrozenRowsPlane,
    visibleCols: number,
    offsetInline: number,
    selection: DxGridSelectionProps,
  ) {
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
            ${[...Array(rows)].map((_, r) => {
              return [...Array(visibleCols)].map((_, c0) => {
                const c = this.visColMin + c0;
                return this.renderCell(c, r, plane, cellSelected(c, r, plane, selection), c0, r);
              });
            })}
          </div>
        </div>`
      : null;
  }

  private renderFrozenColumns(
    plane: DxGridFrozenColsPlane,
    visibleRows: number,
    offsetBlock: number,
    selection: DxGridSelectionProps,
  ) {
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
            ${[...Array(visibleRows)].map((_, r0) => {
              return [...Array(cols)].map((_, c) => {
                const r = this.visRowMin + r0;
                return this.renderCell(c, r, plane, cellSelected(c, r, plane, selection), c, r0);
              });
            })}
          </div>
        </div>`
      : null;
  }

  private cellReadonly(col: number, row: number, plane: DxGridPlane) {
    const colPlane = resolveColPlane(plane);
    const rowPlane = resolveRowPlane(plane);

    const cellReadonly = this.cell(col, row, plane)?.readonly;
    if (cellReadonly !== undefined) {
      return cellReadonly;
    }

    return (
      (this.columns?.[colPlane]?.[col]?.readonly ?? this.columnDefault?.[colPlane]?.readonly) ||
      (this.rows?.[rowPlane]?.[row]?.readonly ?? this.rowDefault?.[rowPlane]?.readonly)
    );
  }

  private renderCell(col: number, row: number, plane: DxGridPlane, selected?: boolean, visCol = col, visRow = row) {
    const cell = this.cell(col, row, plane);
    const active = this.cellActive(col, row, plane);
    const readonly = this.cellReadonly(col, row, plane);
    const resizeIndex = cell?.resizeHandle ? (cell.resizeHandle === 'col' ? col : row) : undefined;
    const resizePlane = cell?.resizeHandle ? resolveFrozenPlane(cell.resizeHandle, plane) : undefined;
    const accessory = cell?.accessoryHtml ? staticHtml`${unsafeStatic(cell.accessoryHtml)}` : null;
    return html`<div
      role="gridcell"
      tabindex="0"
      ?inert=${col < 0 || row < 0}
      aria-selected=${selected ? 'true' : nothing}
      aria-readonly=${readonly ? 'true' : nothing}
      class=${cell?.className ?? nothing}
      data-refs=${cell?.dataRefs ?? nothing}
      ?data-dx-active=${active}
      data-dx-grid-action="cell"
      aria-colindex=${col}
      aria-rowindex=${row}
      style="grid-column:${visCol + 1};grid-row:${visRow + 1}"
    >
      ${this.mode === 'edit' && active ? null : cell?.value}${this.mode === 'edit' && active
        ? null
        : accessory}${cell?.resizeHandle && this.axisResizeable(resizePlane!, cell.resizeHandle, resizeIndex!)
        ? html`<dx-grid-axis-resize-handle
            axis=${cell.resizeHandle}
            plane=${resizePlane}
            index=${resizeIndex}
            size=${this[`${cell.resizeHandle}Size`](resizeIndex!, plane)}
          ></dx-grid-axis-resize-handle>`
        : null}
    </div>`;
  }

  override render() {
    const visibleCols = this.visColMax - this.visColMin;
    const visibleRows = this.visRowMax - this.visRowMin;
    const offsetInline = this.binInlineMin - this.posInline - this.overscanInline;
    const offsetBlock = this.binBlockMin - this.posBlock - this.overscanBlock;
    const selection = selectionProps(this.selectionStart, this.selectionEnd);

    return html`<style>
        ${this.activeRefs
          .split(' ')
          .filter((value) => value)
          .map(
            (activeRef) =>
              `[data-refs~="${activeRef}"] { background: var(--dx-grid-commented-active, var(--dx-gridCommentedActive)) !important; }`,
          )
          .join('\n')}
      </style>
      <div
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
        ?data-grid-select=${selection.visible}
      >
        ${this.renderFixed('fixedStartStart', selection)}${this.renderFrozenRows(
          'frozenRowsStart',
          visibleCols,
          offsetInline,
          selection,
        )}${this.renderFixed('fixedStartEnd', selection)}${this.renderFrozenColumns(
          'frozenColsStart',
          visibleRows,
          offsetBlock,
          selection,
        )}
        <div role="grid" class="dx-grid__plane--grid" tabindex="0" ${ref(this.viewportRef)}>
          <div
            role="none"
            class="dx-grid__plane--grid__content"
            data-dx-grid-plane="grid"
            style="transform:translate3d(${offsetInline}px,${offsetBlock}px,0);grid-template-columns:${this
              .templateGridColumns};grid-template-rows:${this.templateGridRows};"
          >
            ${[...Array(visibleRows)].map((_, r0) => {
              return [...Array(visibleCols)].map((_, c0) => {
                const c = c0 + this.visColMin;
                const r = r0 + this.visRowMin;
                return this.renderCell(c, r, 'grid', cellSelected(c, r, 'grid', selection), c0, r0);
              });
            })}
          </div>
        </div>
        ${this.renderFrozenColumns('frozenColsEnd', visibleRows, offsetBlock, selection)}${this.renderFixed(
          'fixedEndStart',
          selection,
        )}${this.renderFrozenRows('frozenRowsEnd', visibleCols, offsetInline, selection)}${this.renderFixed(
          'fixedEndEnd',
          selection,
        )}
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

  private computeColSizes() {
    this.colSizes = Object.entries(this.columns ?? {}).reduce(
      (acc: DxGridAxisSizes, [plane, planeColMeta]) => {
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
  }

  private computeRowSizes() {
    this.rowSizes = Object.entries(this.rows ?? {}).reduce(
      (acc: DxGridAxisSizes, [plane, planeRowMeta]) => {
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
  }

  override firstUpdated() {
    if (this.getCells) {
      this.updateCells(true);
    }
    this.observer.observe(this.viewportRef.value!);
    this.computeColSizes();
    this.computeRowSizes();
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

    if (changedProperties.has('rowDefault') || changedProperties.has('rows') || changedProperties.has('limitRows')) {
      this.updateIntrinsicBlockSize();
      this.updatePosBlock();
      this.updateVisBlock();
    }

    if (
      changedProperties.has('colDefault') ||
      changedProperties.has('columns') ||
      changedProperties.has('limitColumns')
    ) {
      this.updateIntrinsicInlineSize();
      this.updatePosInline();
      this.updateVisInline();
    }

    if (changedProperties.has('columns')) {
      this.computeColSizes();
      this.updateIntrinsicInlineSize();
    }
    if (changedProperties.has('rows')) {
      this.computeRowSizes();
      this.updateIntrinsicBlockSize();
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

  public updateIfWithinBounds({ col, row }: { col: number; row: number }): boolean {
    if (col >= this.visColMin && col <= this.visColMax && row >= this.visRowMin && row <= this.visRowMax) {
      this.requestUpdate();
      return true;
    }
    return false;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.viewportRef.value) {
      this.observer.unobserve(this.viewportRef.value);
    }
    document.defaultView?.removeEventListener('wheel', this.handleTopLevelWheel);
  }

  override createRenderRoot() {
    return this;
  }
}

export { rowToA1Notation, colToA1Notation } from './util';

export const commentedClassName = 'dx-grid__cell--commented';
