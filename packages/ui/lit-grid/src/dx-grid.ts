//
// Copyright 2024 DXOS.org
//

import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type Ref, createRef, ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

import { defaultColSize, defaultRowSize, focusUnfurlDefault } from './defs';
import './dx-grid-axis-resize-handle';
import {
  DxAxisResize,
  type DxAxisResizeInternal,
  DxEditRequest,
  type DxGridAnnotatedPanEvent,
  type DxGridAxis,
  type DxGridAxisMeta,
  type DxGridAxisMetaProps,
  type DxGridAxisSizes,
  type DxGridCellValue,
  type DxGridCells,
  DxGridCellsSelect,
  type DxGridFixedPlane,
  type DxGridFocusIndicatorVariant,
  type DxGridFrozenAxes,
  type DxGridFrozenColsPlane,
  type DxGridFrozenPlane,
  type DxGridFrozenRowsPlane,
  type DxGridMode,
  type DxGridOverscroll,
  type DxGridPlane,
  type DxGridPlaneCellIndex,
  type DxGridPlaneCells,
  type DxGridPlaneRange,
  type DxGridPlaneRecord,
  type DxGridPointer,
  type DxGridPosition,
  type DxGridRange,
  type DxGridSelectionProps,
  separator,
} from './types';
import {
  cellSelected,
  closestAction,
  closestCell,
  gap,
  isReadonly,
  isSameCell,
  resizeTolerance,
  resolveColPlane,
  resolveFrozenPlane,
  resolveRowPlane,
  selectionProps,
  shouldSelect,
  sizeColMax,
  sizeColMin,
  sizeRowMax,
  sizeRowMin,
  targetIsPlane,
  toCellIndex,
} from './util';

@customElement('dx-grid')
export class DxGrid extends LitElement {
  constructor() {
    super();
    // Wheel, top-level and element-level.
    document.defaultView?.addEventListener('wheel', this.handleTopLevelWheel, { passive: false });
    this.addEventListener('wheel', this.handleWheel);
    // Custom event(s).
    this.addEventListener('dx-axis-resize-internal', this.handleAxisResizeInternal as EventListener);
    // Standard events.
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
  rowDefault: Partial<DxGridPlaneRecord<DxGridFrozenRowsPlane, Partial<DxGridAxisMetaProps>>> = {
    grid: { size: defaultRowSize },
  };

  @property({ type: Object })
  columnDefault: Partial<DxGridPlaneRecord<DxGridFrozenColsPlane, Partial<DxGridAxisMetaProps>>> = {
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

  @property({ type: String })
  overscroll: DxGridOverscroll = undefined;

  @property({ type: String })
  activeRefs = '';

  @property({ type: String })
  focusIndicatorVariant: DxGridFocusIndicatorVariant = 'sheet';

  /**
   * When this function is defined, it is used first to try to get a value for a cell,
   * and otherwise will fall back to `cells`.
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
  private visColMinStart = 0;

  @state()
  private visRowMinStart = 0;

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
  // `frozen…Size` is used to measure space available for the non-fixed planes
  //

  @state()
  private frozenColsSize = 0;

  @state()
  private frozenRowsSize = 0;

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

  @state()
  private totalIntrinsicInlineSize: number = Infinity;

  @state()
  private totalIntrinsicBlockSize: number = Infinity;

  //
  // Primary pointer and keyboard handlers
  //

  private dispatchEditRequest(initialContent?: string): void {
    this.snapPosToFocusedCell();
    if (!this.cellReadonly(this.focusedCell.col, this.focusedCell.row, this.focusedCell.plane)) {
      // Without deferring, the event dispatches before `focusedCellBox` can get updated bounds of the cell, hence:
      queueMicrotask(() => {
        const cellIndex = toCellIndex(this.focusedCell);
        return this.dispatchEvent(
          new DxEditRequest({
            cellIndex,
            cellBox: this.focusedCellBox(),
            cellElement: this.focusedCellElement(),
            initialContent,
          }),
        );
      });
    }
  }

  private dispatchSelectionChange(): boolean {
    return this.dispatchEvent(
      new DxGridCellsSelect({
        start: this.selectionStart,
        end: this.selectionEnd,
      }),
    );
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (this.mode === 'browse' && event.pointerType === 'touch') {
      this.pointer = { state: 'panning', pageX: event.pageX, pageY: event.pageY };
    } else if (event.isPrimary) {
      const { action, actionEl } = closestAction(event.target);
      if (action && action === 'cell') {
        if (event.shiftKey && this.mode === 'browse') {
          // Prevent focus moving so the pointerup handler can move selectionEnd.
          event.preventDefault();
          this.pointer = { state: 'selecting' };
        } else {
          const cellCoords = closestCell(event.target, actionEl);
          if (
            cellCoords &&
            this.mode !== 'edit' &&
            !this.cellReadonly(cellCoords.col, cellCoords.row, cellCoords.plane)
          ) {
            this.pointer = { state: 'maybeSelecting', pageX: event.pageX, pageY: event.pageY };
            this.selectionStart = cellCoords;
            this.selectionEnd = cellCoords;
            this.dispatchSelectionChange();
          }
          if (this.mode === 'edit-select') {
            // Prevent focus moving when editing while selection is possible.
            event.preventDefault();
          } else if (this.focusActive && isSameCell(this.focusedCell, cellCoords)) {
            this.dispatchEditRequest();
          }
        }
      }
    }
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (this.pointer?.state === 'selecting') {
      const cell = closestCell(event.target);
      if (cell) {
        this.setSelectionEnd(cell);
      }
    }
    // TODO(thure): If this was panning via touch, continue panning based on final velocity.
    this.pointer = null;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (this.pointer?.state === 'panning') {
      const panEvent = event as DxGridAnnotatedPanEvent;
      panEvent.deltaX = this.pointer.pageX - event.pageX;
      panEvent.deltaY = this.pointer.pageY - event.pageY;
      this.pointer.pageX = event.pageX;
      this.pointer.pageY = event.pageY;
      this.handleWheel(panEvent);
    } else if (shouldSelect(this.pointer, event)) {
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
  private incrementFocusWithinPlane(event: KeyboardEvent): void {
    const reverse = event.shiftKey;
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
  private moveFocusOrSelectionEndWithinPlane(event: KeyboardEvent): void {
    const current = event.shiftKey ? this.selectionEnd : this.focusedCell;
    const deltaCol = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const deltaRow = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;

    const nextCol = this.clampCol(current, deltaCol);
    const nextRow = this.clampRow(current, deltaRow);

    if (event.shiftKey) {
      this.setSelectionEnd({ ...this.selectionEnd, col: nextCol, row: nextRow });
    } else {
      this.setFocusedCell({ ...this.focusedCell, row: nextRow, col: nextCol });
    }
  }

  private moveFocusBetweenPlanes(event: KeyboardEvent, plane: DxGridPlane): void {
    const planeElement = this.gridRef.value?.querySelector(`[data-dx-grid-plane="${plane}"]`) as HTMLElement | null;
    if (planeElement) {
      const axis = event.key === 'ArrowUp' || event.key === 'ArrowDown' ? 'col' : 'row';
      const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;

      const planeAxis = planeElement?.getAttribute(`data-dx-grid-plane-${axis}`);
      const adjacentPlanes = Array.from(
        this.gridRef.value?.querySelectorAll(`[data-dx-grid-plane-${axis}="${planeAxis}"]`) ?? [planeElement],
      ).filter((el) => !!el) as HTMLElement[];

      adjacentPlanes[
        (adjacentPlanes.length + adjacentPlanes.indexOf(planeElement!) + delta) % adjacentPlanes.length
      ]?.focus({ preventScroll: true });
    }
  }

  private moveFocusIntoPlane(plane: DxGridPlane): void {
    const colPlane = resolveColPlane(plane);
    const rowPlane = resolveRowPlane(plane);
    this.focusedCell = {
      plane,
      col: colPlane === 'grid' ? this.visColMin : 0,
      row: rowPlane === 'grid' ? this.visRowMin : 0,
    };
    this.focusedCellElement()?.focus({ preventScroll: true });
  }

  private moveFocusToPlane(): void {
    this.focusedPlaneElement()?.focus({ preventScroll: true });
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (this.focusActive && this.mode === 'browse') {
      const plane = targetIsPlane(event.target);
      if (plane) {
        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowUp':
          case 'ArrowRight':
          case 'ArrowLeft':
            event.preventDefault();
            this.moveFocusBetweenPlanes(event, plane);
            break;
          case 'Enter':
            event.preventDefault();
            this.moveFocusIntoPlane(plane);
            break;
        }
      } else {
        // Adjust cell-scope state
        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowUp':
          case 'ArrowRight':
          case 'ArrowLeft':
            event.preventDefault();
            this.moveFocusOrSelectionEndWithinPlane(event);
            break;
          case 'Tab':
            event.preventDefault();
            this.incrementFocusWithinPlane(event);
            break;
          case 'Escape':
            // Handle escape if selection is a superset of the focused cell.
            event.preventDefault();
            if (
              this.selectionStart.col !== this.selectionEnd.col ||
              this.selectionStart.row !== this.selectionEnd.row
            ) {
              this.selectionStart = this.focusedCell;
              this.selectionEnd = this.focusedCell;
              this.dispatchSelectionChange();
            } else {
              this.moveFocusToPlane();
            }
            break;
          case 'Enter':
            event.preventDefault();
            this.dispatchEditRequest();
            break;
          case 'Backspace':
          case 'Delete':
            if (!event.defaultPrevented) {
              event.preventDefault();
              this.dispatchEditRequest('');
            }
            break;
          default:
            if (event.key.length === 1 && event.key.match(/\P{Cc}/u) && !(event.metaKey || event.ctrlKey)) {
              this.dispatchEditRequest(event.key);
            }
            break;
        }
      }
    }
  }

  //
  // Accessors
  //

  private colSize(c: number | string, plane: DxGridPlane): number {
    const resolvedPlane = resolveColPlane(plane);
    return this.colSizes?.[resolvedPlane]?.[c] ?? this.columnDefault[resolvedPlane]?.size ?? defaultColSize;
  }

  private rowSize(r: number | string, plane: DxGridPlane): number {
    const resolvedPlane = resolveRowPlane(plane);
    return this.rowSizes?.[resolvedPlane]?.[r] ?? this.rowDefault[resolvedPlane]?.size ?? defaultRowSize;
  }

  private cell(c: number | string, r: number | string, plane: DxGridPlane): DxGridCellValue | undefined {
    const index: DxGridPlaneCellIndex = `${c}${separator}${r}`;
    return this.cells?.[plane]?.[index] ?? this.initialCells?.[plane]?.[index];
  }

  private cellActive(c: number | string, r: number | string, plane: DxGridPlane): boolean {
    return this.focusedCell.plane === plane && this.focusedCell.col === c && this.focusedCell.row === r;
  }

  private setFocusedCell(nextCoords: DxGridPosition): void {
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

  // Internal utility for setting selection end.

  private setSelectionEnd(nextCoords: DxGridPosition): void {
    if (
      this.selectionEnd.plane !== nextCoords.plane ||
      this.selectionEnd.col !== nextCoords.col ||
      this.selectionEnd.row !== nextCoords.row
    ) {
      this.selectionEnd = nextCoords;
      this.dispatchSelectionChange();
    }
  }

  // Selection setter for consumers

  setSelection(range: DxGridRange): void {
    if (this.mode !== 'edit') {
      this.selectionStart = range.start;
      this.selectionEnd = range.end;
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
  // Resize & reposition handlers, observer, ref.
  //

  @state()
  private observer = new ResizeObserver((entries) => {
    const { inlineSize, blockSize } = entries?.[0]?.contentBoxSize?.[0] ?? {
      inlineSize: 0,
      blockSize: 0,
    };
    if (
      Math.abs(inlineSize - this.frozenColsSize - this.sizeInline) > resizeTolerance ||
      Math.abs(blockSize - this.frozenRowsSize - this.sizeBlock) > resizeTolerance
    ) {
      // console.info('[updating bounds]', 'resize', [inlineSize - this.sizeInline, blockSize - this.sizeBlock]);
      this.sizeInline = inlineSize - this.frozenColsSize;
      this.sizeBlock = blockSize - this.frozenRowsSize;
      this.updateVis();
      queueMicrotask(() => this.updatePos());
    }
  });

  private gridRef: Ref<HTMLDivElement> = createRef();

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

  private maxPosInline(): number {
    return this.intrinsicInlineSize - this.sizeInline;
  }

  private maxPosBlock(): number {
    return this.intrinsicBlockSize - this.sizeBlock;
  }

  private updatePosInline(inline?: number, maxInline: number = this.maxPosInline()): void {
    this.posInline = Math.max(0, Math.min(maxInline, inline ?? this.posInline));
    this.maybeUpdateVisInline();
  }

  private updatePosBlock(block?: number, maxBlock: number = this.maxPosBlock()): void {
    this.posBlock = Math.max(0, Math.min(maxBlock, block ?? this.posBlock));
    this.maybeUpdateVisBlock();
  }

  private updatePos(inline?: number, block?: number, maxInline?: number, maxBlock?: number): void {
    this.updatePosInline(inline, maxInline);
    this.updatePosBlock(block, maxBlock);
  }

  private handleTopLevelWheel = (event: DxGridAnnotatedPanEvent) => {
    if (event.gridId === (this.gridId ?? 'never')) {
      if (
        this.overscroll === 'trap' ||
        (this.overscroll === 'inline' && event.overscrollInline === 0) ||
        (this.overscroll === 'block' && event.overscrollBlock === 0)
      ) {
        const element = event.target as HTMLElement;
        const activeCell = element.closest('[data-dx-active]');
        const contentEl = element.closest('.dx-grid__cell__content');
        if (
          !(
            element &&
            activeCell &&
            contentEl &&
            (contentEl.scrollWidth > contentEl.clientWidth || contentEl.scrollHeight > contentEl.clientHeight)
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }
  };

  private handleWheel = (event: DxGridAnnotatedPanEvent) => {
    if (this.mode === 'browse') {
      const { deltaX, deltaY } = this.getOverflowingCellModifiedDeltas(event);
      const nextPosInline = this.posInline + deltaX;
      const nextPosBlock = this.posBlock + deltaY;
      const maxPosInline = this.maxPosInline();
      const maxPosBlock = this.maxPosBlock();
      this.updatePos(nextPosInline, nextPosBlock, maxPosInline, maxPosBlock);
      event.overscrollInline =
        nextPosInline <= 0 ? nextPosInline : nextPosInline > maxPosInline ? nextPosInline - maxPosInline : 0;
      event.overscrollBlock =
        nextPosBlock <= 0 ? nextPosBlock : nextPosBlock > maxPosBlock ? nextPosBlock - maxPosBlock : 0;
      event.gridId = this.gridId;
    }
  };

  private updateVisInline(): void {
    // todo: avoid starting from zero.
    let axisCursor = 0;
    let pxCursor = this.colSize(axisCursor, 'grid');

    while (pxCursor < this.posInline) {
      axisCursor += 1;
      pxCursor += this.colSize(axisCursor, 'grid') + gap;
    }

    this.visColMin = axisCursor;

    this.visColMinStart = pxCursor - this.colSize(axisCursor, 'grid') - gap;
    const visColMinEnd = pxCursor;

    while (pxCursor < this.posInline + this.sizeInline) {
      axisCursor += 1;
      pxCursor += this.colSize(axisCursor, 'grid') + gap;
    }

    this.visColMax = Math.min(this.limitColumns, axisCursor + 1);
    const visColMaxStart = pxCursor - this.colSize(axisCursor, 'grid') - gap;
    const visColMaxEnd = pxCursor;

    const bifurcateStart = visColMaxStart - this.sizeInline;
    const bifurcateEnd = visColMaxEnd - this.sizeInline;

    const bounds = [this.visColMinStart, visColMinEnd, bifurcateStart, bifurcateEnd].sort((a, b) => a - b);
    let boundsCursor = 1;
    while (bounds[boundsCursor] < this.posInline && boundsCursor < 3) {
      boundsCursor += 1;
    }

    this.binInlineMin = bounds[boundsCursor - 1];
    this.binInlineMax = bounds[boundsCursor];

    this.templateGridColumns = [...Array(this.visColMax - this.visColMin)]
      .map((_, c0) => `${this.colSize(this.visColMin + c0, 'grid')}px`)
      .join(' ');

    this.templatefrozenColsStart = [...Array(this.frozen.frozenColsStart ?? 0)]
      .map((_, c0) => `${this.colSize(c0, 'frozenColsStart')}px`)
      .join(' ');

    this.templatefrozenColsEnd = [...Array(this.frozen.frozenColsEnd ?? 0)]
      .map((_, c0) => `${this.colSize(c0, 'frozenColsEnd')}px`)
      .join(' ');

    this.frozenColsSize =
      [...Array(this.frozen.frozenColsStart ?? 0)].reduce(
        (sum, _, c0) => sum + this.colSize(c0, 'frozenColsStart'),
        0,
      ) +
      gap * Math.max(0, this.frozen.frozenColsStart ?? 0 - 1) +
      [...Array(this.frozen.frozenColsEnd ?? 0)].reduce((sum, _, c0) => sum + this.colSize(c0, 'frozenColsEnd'), 0) +
      gap * Math.max(0, this.frozen.frozenColsEnd ?? 0 - 1);
  }

  private updateVisBlock(): void {
    // todo: avoid starting from zero.
    let axisCursor = 0;
    let pxCursor = this.rowSize(axisCursor, 'grid');

    while (pxCursor < this.posBlock) {
      axisCursor += 1;
      pxCursor += this.rowSize(axisCursor, 'grid') + gap;
    }

    this.visRowMin = axisCursor;

    this.visRowMinStart = pxCursor - this.rowSize(axisCursor, 'grid') - gap;
    const visRowMinEnd = pxCursor;

    while (pxCursor < this.posBlock + this.sizeBlock) {
      axisCursor += 1;
      pxCursor += this.rowSize(axisCursor, 'grid') + gap;
    }

    this.visRowMax = Math.min(this.limitRows, axisCursor + 1);
    const visRowMaxStart = pxCursor - this.rowSize(axisCursor, 'grid') - gap;
    const visRowMaxEnd = pxCursor;

    const bifurcateStart = visRowMaxStart - this.sizeBlock;
    const bifurcateEnd = visRowMaxEnd - this.sizeBlock;

    const bounds = [this.visRowMinStart, visRowMinEnd, bifurcateStart, bifurcateEnd].sort((a, b) => a - b);
    let boundsCursor = 1;
    while (bounds[boundsCursor] < this.posBlock && boundsCursor < 3) {
      boundsCursor += 1;
    }

    this.binBlockMin = bounds[boundsCursor - 1];
    this.binBlockMax = bounds[boundsCursor];

    this.templateGridRows = [...Array(this.visRowMax - this.visRowMin)]
      .map((_, r0) => `${this.rowSize(this.visRowMin + r0, 'grid')}px`)
      .join(' ');

    this.templatefrozenRowsStart = [...Array(this.frozen.frozenRowsStart ?? 0)]
      .map((_, r0) => `${this.rowSize(r0, 'frozenRowsStart')}px`)
      .join(' ');

    this.templatefrozenRowsEnd = [...Array(this.frozen.frozenRowsEnd ?? 0)]
      .map((_, r0) => `${this.rowSize(r0, 'frozenRowsEnd')}px`)
      .join(' ');

    this.frozenRowsSize =
      [...Array(this.frozen.frozenRowsStart ?? 0)].reduce(
        (sum, _, r0) => sum + this.rowSize(r0, 'frozenRowsStart'),
        0,
      ) +
      gap * Math.max(0, this.frozen.frozenRowsStart ?? 0 - 1) +
      [...Array(this.frozen.frozenRowsEnd ?? 0)].reduce((sum, _, r0) => sum + this.rowSize(r0, 'frozenRowsEnd'), 0) +
      gap * Math.max(0, this.frozen.frozenRowsEnd ?? 0 - 1);
  }

  private updateVis(): void {
    this.updateVisInline();
    this.updateVisBlock();
  }

  public updateCells(includeFixed?: boolean): void {
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

  setFocus(coords: DxGridPosition, snap = true): void {
    this.setFocusedCell(coords);
    this.focusActive = true;
    if (snap) {
      this.snapPosToFocusedCell();
    }
  }

  private handleFocus(event: FocusEvent): void {
    const cellCoords = closestCell(event.target);
    if (cellCoords || targetIsPlane(event.target)) {
      this.focusActive = true;
      if (cellCoords) {
        this.setFocusedCell(cellCoords);
      }
    }
  }

  private handleBlur(event: FocusEvent): void {
    // Only unset `focusActive` if focus is moving to an element outside the grid.
    if (event.relatedTarget && !(event.relatedTarget as HTMLElement).closest(`[data-grid="${this.gridId}"]`)) {
      this.focusActive = false;
    }
  }

  private focusedCellQuery(): string {
    return `[data-dx-grid-plane=${this.focusedCell.plane}] [aria-colindex="${this.focusedCell.col}"][aria-rowindex="${this.focusedCell.row}"]`;
  }

  private focusedPlaneQuery(): string {
    return `[data-dx-grid-plane=${this.focusedCell.plane}]`;
  }

  private focusedCellElement(): HTMLElement | null {
    return this.gridRef.value?.querySelector(this.focusedCellQuery()) as HTMLElement | null;
  }

  private focusedPlaneElement(): HTMLElement | null {
    return this.gridRef.value?.querySelector(this.focusedPlaneQuery()) as HTMLElement | null;
  }

  //
  // `outOfVis` returns by how many rows/cols the focused cell is outside of the `vis` range for an axis, inset by a
  // `delta`, otherwise zero if it is within that range.
  //

  private focusedCellRowOutOfVis(): number {
    return this.focusedCell.row <= this.visRowMin
      ? this.focusedCell.row - this.visRowMin - 1
      : this.focusedCell.row >= this.visRowMax - 1
        ? this.focusedCell.row + 2 - this.visRowMax
        : 0;
  }

  private focusedCellColOutOfVis(): number {
    return this.focusedCell.col <= this.visColMin
      ? this.focusedCell.col - this.visColMin - 1
      : this.focusedCell.col >= this.visColMax - 1
        ? this.focusedCell.col + 2 - this.visColMax
        : 0;
  }

  private focusedCellOutOfVis(): { col: number; row: number } {
    switch (this.focusedCell.plane) {
      case 'grid':
        return { row: this.focusedCellRowOutOfVis(), col: this.focusedCellColOutOfVis() };
      case 'frozenRowsStart':
      case 'frozenRowsEnd':
        return { col: this.focusedCellColOutOfVis(), row: 0 };
      case 'frozenColsStart':
      case 'frozenColsEnd':
        return { col: 0, row: this.focusedCellRowOutOfVis() };
      default:
        return { col: 0, row: 0 };
    }
  }

  private clampCol(coords: DxGridPosition, deltaCol = 0): number {
    const colPlane = resolveColPlane(coords.plane);
    const colMax = (colPlane === 'grid' ? this.limitColumns : this.frozen[colPlane]!) - 1;
    return Math.max(0, Math.min(colMax, coords.col + deltaCol));
  }

  private clampRow(coords: DxGridPosition, deltaRow = 0): number {
    const rowPlane = resolveRowPlane(coords.plane);
    const rowMax = (rowPlane === 'grid' ? this.limitRows : this.frozen[rowPlane]!) - 1;
    return Math.max(0, Math.min(rowMax, coords.row + deltaRow));
  }

  /**
   * Moves focus to the cell with actual focus, otherwise moves focus to the viewport.
   */
  refocus(increment: 'col' | 'row' | undefined = undefined, delta: 1 | -1 | 0 = 1): void {
    if (increment) {
      switch (increment) {
        case 'col': {
          this.focusedCell.col = this.clampCol(this.focusedCell, delta);
          break;
        }
        case 'row': {
          this.focusedCell.row = this.clampRow(this.focusedCell, delta);
          break;
        }
      }
      this.snapPosToFocusedCell();
    }

    queueMicrotask(() => {
      const cellElement = this.focusedCellElement();
      if (cellElement) {
        if (cellElement !== document.activeElement) {
          cellElement.focus({ preventScroll: true });
        }
      } else {
        this.moveFocusToPlane();
      }
    });
  }

  private clampPosInline(nextPos: number): number {
    return Math.max(0, Math.min(this.intrinsicInlineSize - this.sizeInline, nextPos));
  }

  private clampPosBlock(nextPos: number): number {
    return Math.max(0, Math.min(this.intrinsicBlockSize - this.sizeBlock, nextPos));
  }

  /**
   * Calculate the pixel offset for a given column in a plane.
   * Sums all column sizes plus gaps up to the target column.
   */
  private inlineOffset(col: number, plane: DxGridPlane): number {
    return [...Array(col)].reduce((acc, _, c0) => {
      return acc + this.colSize(c0, plane) + gap;
    }, 0);
  }

  /**
   * Calculate the pixel offset for a given row in a plane.
   * Sums all row sizes plus gaps up to the target row.
   */
  private blockOffset(row: number, plane: DxGridPlane): number {
    return [...Array(row)].reduce((acc, _, r0) => {
      return acc + this.rowSize(r0, plane) + gap;
    }, 0);
  }

  /**
   * Updates `pos` so that a cell in focus is fully within the viewport.
   */
  snapPosToFocusedCell(): void {
    const outOfVis = this.focusedCellOutOfVis();
    if (outOfVis.col < 0) {
      // align viewport start edge with focused cell start edge
      this.posInline = this.clampPosInline(this.inlineOffset(this.focusedCell.col, 'grid'));
      this.updateVisInline();
    } else if (outOfVis.col > 0) {
      // align viewport end edge with focused cell end edge
      this.posInline = this.clampPosInline(this.inlineOffset(this.focusedCell.col + 1, 'grid') - this.sizeInline - gap);
      this.updateVisInline();
    }

    if (outOfVis.row < 0) {
      // align viewport start edge with focused cell start edge
      this.posBlock = this.clampPosBlock(this.blockOffset(this.focusedCell.row, 'grid'));
      this.updateVisBlock();
    } else if (outOfVis.row > 0) {
      // align viewport end edge with focused cell end edge
      this.posBlock = this.clampPosBlock(this.blockOffset(this.focusedCell.row + 1, 'grid') - this.sizeBlock - gap);
      this.updateVisBlock();
    }
  }

  scrollToCoord({ coords }: { coords: DxGridPosition }): void {
    const plane = coords.plane;
    const { row, col } = coords;

    this.updatePosBlock(this.blockOffset(row, plane));
    this.updatePosInline(this.inlineOffset(col, plane));
  }

  scrollToColumn(col: number): void {
    this.updatePosInline(this.inlineOffset(col, 'grid'));
  }

  scrollToRow(row: number): void {
    this.updatePosBlock(this.blockOffset(row, 'grid'));
  }

  scrollToEndRow(): void {
    this.updatePosBlock(Infinity);
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

  private axisResizeable(plane: 'grid' | DxGridFrozenPlane, axis: DxGridAxis, index: number | string): boolean {
    return axis === 'col'
      ? !!(this.columns[plane]?.[index]?.resizeable ?? this.columnDefault[plane as DxGridFrozenColsPlane]?.resizeable)
      : !!(this.rows[plane]?.[index]?.resizeable ?? this.rowDefault[plane as DxGridFrozenRowsPlane]?.resizeable);
  }

  private clampAxisSize(
    plane: 'grid' | DxGridFrozenPlane,
    axis: DxGridAxis,
    index: number | string,
    requestedSize: number,
  ): number {
    const minSize =
      axis === 'col'
        ? (this.columns[plane]?.[index]?.minSize ??
          this.columnDefault[plane as DxGridFrozenColsPlane]?.minSize ??
          sizeColMin)
        : (this.rows[plane]?.[index]?.minSize ??
          this.rowDefault[plane as DxGridFrozenRowsPlane]?.minSize ??
          sizeRowMin);
    const maxSize =
      axis === 'col'
        ? (this.columns[plane]?.[index]?.maxSize ??
          this.columnDefault[plane as DxGridFrozenColsPlane]?.maxSize ??
          sizeColMax)
        : (this.rows[plane]?.[index]?.maxSize ??
          this.rowDefault[plane as DxGridFrozenRowsPlane]?.maxSize ??
          sizeRowMax);
    return Math.max(minSize, Math.min(maxSize, requestedSize));
  }

  private handleAxisResizeInternal(event: DxAxisResizeInternal): void {
    event.stopPropagation();
    const { plane, axis, delta, size, index, state } = event;
    const nextSize = this.clampAxisSize(plane, axis, index, size + delta);
    if (axis === 'col') {
      this.colSizes = { ...this.colSizes, [plane]: { ...this.colSizes[plane], [index]: nextSize } };
      this.updateVisInline();
      this.updateIntrinsicInlineSize();
    } else {
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
  // Render and other lifecycle methods.
  //

  // TODO(thure): This is for rendering presentational objects superimposed onto the canonical grid (e.g. DnD drop line for #8108).
  private renderPresentationLayer(offsetInline: number, offsetBlock: number) {
    const visibleCols = this.visColMax - this.visColMin;
    const visibleRows = this.visRowMax - this.visRowMin;
    return html`<div
      role="none"
      class="dx-grid-layer--presentation"
      style=${styleMap({
        gridTemplateColumns: [
          ...[...Array(this.frozen.frozenColsStart ?? 0)].map((_, c0) => `${this.colSize(c0, 'frozenColsStart')}px`),
          ...[...Array(visibleCols)].map((_, c0) =>
            c0 === visibleCols - 1
              ? '1fr'
              : `${this.colSize(this.visColMin + c0, 'grid') + (c0 === 0 ? offsetInline : 0)}px`,
          ),
          ...[...Array(this.frozen.frozenColsEnd ?? 0)].map((_, c0) => `${this.colSize(c0, 'frozenColsEnd')}px`),
        ].join(' '),
        gridTemplateRows: [
          ...[...Array(this.frozen.frozenRowsStart ?? 0)].map((_, r0) => `${this.rowSize(r0, 'frozenRowsStart')}px`),
          ...[...Array(visibleRows)].map((_, r0) =>
            r0 === visibleRows - 1
              ? '1fr'
              : `${this.rowSize(this.visRowMin + r0, 'grid') + (r0 === 0 ? offsetBlock : 0)}px`,
          ),
          ...[...Array(this.frozen.frozenRowsEnd ?? 0)].map((_, r0) => `${this.rowSize(r0, 'frozenRowsEnd')}px`),
        ].join(' '),
      })}
    >
      ${
        /* TODO(thure): These are debug cells, remove when rendering actual overlay content. */ [
          ...Array((this.frozen.frozenRowsStart ?? 0) + visibleRows + (this.frozen.frozenRowsEnd ?? 0)),
        ].map((_, r0) =>
          [...Array((this.frozen.frozenColsStart ?? 0) + visibleCols + (this.frozen.frozenColsEnd ?? 0))].map(
            (_, c0) =>
              html`<div
                role="none"
                class="dx-grid-layer--presentation__cell"
                style="grid-column:${c0 + 1};grid-row:${r0 + 1}"
              ></div>`,
          ),
        )
      }
    </div>`;
  }

  private renderFixed(plane: DxGridFixedPlane, selection: DxGridSelectionProps) {
    const colPlane = resolveColPlane(plane) as DxGridFrozenPlane;
    const rowPlane = resolveRowPlane(plane) as DxGridFrozenPlane;
    const cols = this.frozen[colPlane];
    const rows = this.frozen[rowPlane];
    return (cols ?? 0) > 0 && (rows ?? 0) > 0
      ? html`<div
          role="none"
          tabindex="0"
          data-dx-grid-plane=${plane}
          data-dx-grid-plane-row=${plane === 'fixedStartStart' || plane === 'fixedStartEnd' ? 0 : 2}
          data-dx-grid-plane-col=${plane === 'fixedStartStart' || plane === 'fixedEndStart' ? 0 : 2}
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
    return (rows ?? 0) > 0 && this.limitColumns > 0
      ? html`<div
          role="none"
          class="dx-grid__plane--frozen-row"
          tabindex="0"
          data-dx-grid-plane=${plane}
          data-dx-grid-plane-row=${plane === 'frozenRowsStart' ? 0 : 2}
          data-dx-grid-plane-col="1"
        >
          <div
            role="none"
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
    return (cols ?? 0) > 0 && this.limitRows > 0
      ? html`<div
          role="none"
          class="dx-grid__plane--frozen-col"
          tabindex="0"
          data-dx-grid-plane=${plane}
          data-dx-grid-plane-col=${plane === 'frozenColsStart' ? 0 : 2}
          data-dx-grid-plane-row="1"
        >
          <div
            role="none"
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

  private renderMainGrid(
    visibleCols: number,
    visibleRows: number,
    offsetInline: number,
    offsetBlock: number,
    selection: DxGridSelectionProps,
  ) {
    return this.limitRows > 0 && this.limitColumns > 0
      ? html`<div
          role="grid"
          class="dx-grid__plane--grid"
          tabindex="0"
          data-dx-grid-plane="grid"
          data-dx-grid-plane-row="1"
          data-dx-grid-plane-col="1"
        >
          <div
            role="none"
            class="dx-grid__plane--grid__content"
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
        </div>`
      : null;
  }

  private cellReadonly(col: number, row: number, plane: DxGridPlane): boolean {
    const colPlane = resolveColPlane(plane);
    const rowPlane = resolveRowPlane(plane);

    // Check cell-specific setting first.
    const cellReadonly = this.cell(col, row, plane)?.readonly;
    if (cellReadonly !== undefined) {
      return isReadonly(cellReadonly);
    }

    // Check column/row defaults.
    const colReadOnly = this.columns?.[colPlane]?.[col]?.readonly ?? this.columnDefault?.[colPlane]?.readonly;
    const rowReadOnly = this.rows?.[rowPlane]?.[row]?.readonly ?? this.rowDefault?.[rowPlane]?.readonly;

    return isReadonly(colReadOnly) || isReadonly(rowReadOnly);
  }

  private cellFocusUnfurl(col: number, row: number, plane: DxGridPlane): boolean {
    const colPlane = resolveColPlane(plane);
    const rowPlane = resolveRowPlane(plane);

    // Check cell-specific setting first.
    const cellUnfurl = this.cell(col, row, plane)?.focusUnfurl;
    if (cellUnfurl !== undefined) {
      return cellUnfurl;
    }

    // Check column/row defaults.
    const colUnfurl = this.columns?.[colPlane]?.[col]?.focusUnfurl ?? this.columnDefault?.[colPlane]?.focusUnfurl;
    const rowUnfurl = this.rows?.[rowPlane]?.[row]?.focusUnfurl ?? this.rowDefault?.[rowPlane]?.focusUnfurl;

    return colUnfurl ?? rowUnfurl ?? focusUnfurlDefault;
  }

  /**
   * Determines if the cell's text content should be selectable based on its readonly value.
   * @returns true if the cells text content is selectable, false otherwise.
   */
  private cellTextSelectable(col: number, row: number, plane: DxGridPlane): boolean {
    const colPlane = resolveColPlane(plane);
    const rowPlane = resolveRowPlane(plane);

    // Check cell-specific setting first.
    const cellReadonly = this.cell(col, row, plane)?.readonly;
    if (cellReadonly !== undefined) {
      return cellReadonly === 'text-select';
    }

    // Check column/row defaults.
    const colReadonly = this.columns?.[colPlane]?.[col]?.readonly ?? this.columnDefault?.[colPlane]?.readonly;
    const rowReadonly = this.rows?.[rowPlane]?.[row]?.readonly ?? this.rowDefault?.[rowPlane]?.readonly;
    return colReadonly === 'text-select' || rowReadonly === 'text-select';
  }

  private getOverflowingCellModifiedDeltas(
    event: DxGridAnnotatedPanEvent,
  ): Pick<DxGridAnnotatedPanEvent, 'deltaX' | 'deltaY'> {
    if (!event.target) {
      return event;
    }
    const element = event.target as HTMLElement;
    const activeCell = element.closest('[data-dx-active]');
    const contentEl = element.closest('.dx-grid__cell__content');

    if (!activeCell || !contentEl || !document.activeElement?.contains(element)) {
      return event;
    }

    // Commented-out code will let the event delta through unmodified if the cell can scroll but is scrolled to the end
    // in the same direction as the wheel event, a.k.a. “overscroll”; this is probably undesirable, though.

    const { scrollWidth, clientWidth, scrollHeight, clientHeight /*, scrollLeft, scrollTop */ } = contentEl;

    if (scrollWidth <= clientWidth && scrollHeight <= clientHeight) {
      return event;
    }

    const deltaX =
      scrollWidth > clientWidth /* &&
      ((event.deltaX < 0 && scrollLeft > 0) || (event.deltaX > 0 && scrollLeft < scrollWidth - clientWidth)) */
        ? 0
        : event.deltaX;

    const deltaY =
      scrollHeight > clientHeight /* &&
      ((event.deltaY < 0 && scrollTop > 0) || (event.deltaY > 0 && scrollTop < scrollHeight - clientHeight)) */
        ? 0
        : event.deltaY;

    return { deltaX, deltaY };
  }

  private renderCell(col: number, row: number, plane: DxGridPlane, selected?: boolean, visCol = col, visRow = row) {
    const cell = this.cell(col, row, plane);
    const active = this.cellActive(col, row, plane);
    const readonly = this.cellReadonly(col, row, plane);
    const focusUnfurl = this.cellFocusUnfurl(col, row, plane);
    const textSelectable = this.cellTextSelectable(col, row, plane);
    const resizeIndex = cell?.resizeHandle ? (cell.resizeHandle === 'col' ? col : row) : undefined;
    const resizePlane = cell?.resizeHandle ? resolveFrozenPlane(cell.resizeHandle, plane) : undefined;
    const accessory = cell?.accessoryHtml ? staticHtml`${unsafeStatic(cell.accessoryHtml)}` : null;
    return html`<div
      role="gridcell"
      tabindex="0"
      aria-selected=${selected ? 'true' : nothing}
      aria-readonly=${readonly ? 'true' : nothing}
      class=${cell?.className ?? nothing}
      data-refs=${cell?.dataRefs ?? nothing}
      data-focus-unfurl=${focusUnfurl ? nothing : 'false'}
      ?data-dx-active=${active}
      data-text-selectable=${textSelectable ? 'true' : 'false'}
      data-dx-grid-action="cell"
      aria-colindex=${col}
      aria-rowindex=${row}
      style="grid-column:${visCol + 1};grid-row:${visRow + 1}"
    >
      <div role="none" class="dx-grid__cell__content">${cell?.value}${accessory}</div>
      ${cell?.resizeHandle &&
      this.mode === 'browse' &&
      this.axisResizeable(resizePlane!, cell.resizeHandle, resizeIndex!)
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
    const offsetInline = this.visColMinStart - this.posInline + gap;
    const offsetBlock = this.visRowMinStart - this.posBlock + gap;
    const selection = selectionProps(this.selectionStart, this.selectionEnd);

    return html`<style>
        ${this.activeRefs
          .split(' ')
          .filter((value) => value)
          .map(
            // TODO(burdon): Consistent camelCase?
            (activeRef) =>
              `[data-refs~="${activeRef}"] { background: var(--dx-grid-commented-active, var(--dx-gridCommentedActive)) !important; }`,
          )
          .join('\n')}
      </style>
      <div
        role="none"
        class="dx-grid"
        data-arrow-keys="all"
        style=${styleMap({
          'grid-template-columns': [
            this.templatefrozenColsStart ? 'min-content' : false,
            this.limitColumns > 0 &&
              `minmax(0, ${Number.isFinite(this.limitColumns) ? `${Math.max(0, this.intrinsicInlineSize)}px` : '1fr'})`,
            this.templatefrozenColsEnd ? 'min-content' : false,
          ]
            .filter(Boolean)
            .join(' '),
          'grid-template-rows': [
            this.templatefrozenRowsStart ? 'min-content' : false,
            this.limitRows > 0 &&
              `minmax(0, ${Number.isFinite(this.limitRows) ? `${Math.max(0, this.intrinsicBlockSize)}px` : '1fr'})`,
            this.templatefrozenRowsEnd ? ' min-content' : false,
          ]
            .filter(Boolean)
            .join(' '),
          '--dx-grid-content-inline-size': Number.isFinite(this.limitColumns)
            ? `${Math.max(0, this.totalIntrinsicInlineSize)}px`
            : 'max-content',
          '--dx-grid-content-block-size': Number.isFinite(this.limitRows)
            ? `${Math.max(0, this.totalIntrinsicBlockSize)}px`
            : 'max-content',
        })}
        data-grid=${this.gridId}
        data-grid-mode=${this.mode}
        data-grid-focus-indicator-variant=${this.focusIndicatorVariant}
        ?data-grid-select=${selection.visible}
        ${ref(this.gridRef)}
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
        ${this.renderMainGrid(visibleCols, visibleRows, offsetInline, offsetBlock, selection)}
        ${this.renderFrozenColumns('frozenColsEnd', visibleRows, offsetBlock, selection)}${this.renderFixed(
          'fixedEndStart',
          selection,
        )}${this.renderFrozenRows('frozenRowsEnd', visibleCols, offsetInline, selection)}${this.renderFixed(
          'fixedEndEnd',
          selection,
        )}
      </div>`;
  }

  private updateIntrinsicInlineSize(): void {
    this.intrinsicInlineSize = Number.isFinite(this.limitColumns)
      ? [...Array(this.limitColumns)].reduce((acc, _, c0) => acc + this.colSize(c0, 'grid'), 0) +
        gap * Math.max(0, this.limitColumns - 1)
      : Infinity;
    this.totalIntrinsicInlineSize =
      this.limitColumns > 0 ? this.intrinsicInlineSize + this.frozenColsSize : this.frozenColsSize - gap;
  }

  private updateIntrinsicBlockSize(): void {
    this.intrinsicBlockSize = Number.isFinite(this.limitRows)
      ? [...Array(this.limitRows)].reduce((acc, _, r0) => acc + this.rowSize(r0, 'grid'), 0) +
        gap * Math.max(0, this.limitRows - 1)
      : Infinity;
    this.totalIntrinsicBlockSize =
      this.limitRows > 0 ? this.intrinsicBlockSize + this.frozenRowsSize : this.frozenRowsSize - gap;
  }

  private updateIntrinsicSizes(): void {
    this.updateIntrinsicInlineSize();
    this.updateIntrinsicBlockSize();
  }

  private computeColSizes(): void {
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

  private computeRowSizes(): void {
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

  override firstUpdated(): void {
    if (this.getCells) {
      this.updateCells(true);
    }
    this.observer.observe(this.gridRef.value!);
    this.computeColSizes();
    this.computeRowSizes();
    this.updateIntrinsicSizes();
  }

  override willUpdate(changedProperties: Map<string, any>): void {
    if (changedProperties.has('rowDefault') || changedProperties.has('rows') || changedProperties.has('limitRows')) {
      this.computeRowSizes();
      this.updateIntrinsicBlockSize();
      this.updatePosBlock();
      this.updateVisBlock();
    }

    if (
      changedProperties.has('columnDefault') ||
      changedProperties.has('columns') ||
      changedProperties.has('limitColumns')
    ) {
      this.computeColSizes();
      this.updateIntrinsicInlineSize();
      this.updatePosInline();
      this.updateVisInline();
    }

    if (changedProperties.has('frozen')) {
      this.updateIntrinsicBlockSize();
      this.updateIntrinsicInlineSize();
      this.updateVisBlock();
      this.updateVisInline();
    }

    if (
      this.getCells &&
      (changedProperties.has('initialCells') ||
        changedProperties.has('visColMin') ||
        changedProperties.has('visColMax') ||
        changedProperties.has('visRowMin') ||
        changedProperties.has('visRowMax') ||
        changedProperties.has('columns') ||
        changedProperties.has('rows') ||
        changedProperties.has('limitColumns') ||
        changedProperties.has('limitRows') ||
        changedProperties.has('frozen'))
    ) {
      this.updateCells(true);
    }
  }

  override updated(changedProperties: Map<string, any>): void {
    // Update the focused element if there is a change in bounds (otherwise Lit keeps focus on the relative element).
    if (
      this.focusActive &&
      (changedProperties.has('visColMin') ||
        changedProperties.has('visColMax') ||
        changedProperties.has('visRowMin') ||
        changedProperties.has('visRowMax') ||
        changedProperties.has('focusedCell'))
    ) {
      this.refocus();
    }
  }

  public updateIfWithinBounds({ col, row }: { col: number; row: number }, includeFixed?: boolean): boolean {
    if (col >= this.visColMin && col <= this.visColMax && row >= this.visRowMin && row <= this.visRowMax) {
      this.updateCells(includeFixed);
      this.requestUpdate();
      return true;
    }
    return false;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.gridRef.value) {
      this.observer.unobserve(this.gridRef.value);
    }
    document.defaultView?.removeEventListener('wheel', this.handleTopLevelWheel);
  }

  override createRenderRoot(): this {
    return this;
  }
}

export {
  rowToA1Notation,
  colToA1Notation,
  closestAction,
  closestCell,
  parseCellIndex,
  toPlaneCellIndex,
  cellQuery,
  accessoryHandlesPointerdownAttrs,
} from './util';

export const commentedClassName = 'dx-grid__cell--commented';
