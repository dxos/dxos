//
// Copyright 2024 DXOS.org
//

import { LitElement, html } from 'lit';
import { customElement, state, property, eventOptions } from 'lit/decorators.js';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';

import {
  type AxisMeta,
  type CellIndex,
  type CellValue,
  DxAxisResize,
  type DxAxisResizeProps,
  DxEditRequest,
  type DxGridAxis,
  type DxGridPositionNullable,
} from './types';

/**
 * The size in pixels of the gap between cells
 */
const gap = 1;

/**
 * This should be about the width of the `1` numeral so resize is triggered as the row header column’s intrinsic size
 * changes when scrolling vertically.
 */
const resizeTolerance = 8;

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

/**
 * Separator for serializing cell position vectors
 */
const separator = ',';

//
// A1 notation is the fallback for numbering columns and rows.
//

const colToA1Notation = (col: number): string => {
  return (
    (col >= 26 ? String.fromCharCode('A'.charCodeAt(0) + Math.floor(col / 26) - 1) : '') +
    String.fromCharCode('A'.charCodeAt(0) + (col % 26))
  );
};

const rowToA1Notation = (row: number): string => {
  return `${row + 1}`;
};

const closestAction = (target: EventTarget | null): { action: string | null; actionEl: HTMLElement | null } => {
  const actionEl: HTMLElement | null = (target as HTMLElement | null)?.closest('[data-dx-grid-action]') ?? null;
  return { actionEl, action: actionEl?.getAttribute('data-dx-grid-action') ?? null };
};

const closestCell = (target: EventTarget | null, actionEl?: HTMLElement | null): Record<DxGridAxis, number> | null => {
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
    return { col, row };
  } else {
    return null;
  }
};

const isSameCell = (a: DxGridPositionNullable, b: DxGridPositionNullable) =>
  a && b && Number.isFinite(a.col) && Number.isFinite(a.row) && a.col === b.col && a.row === b.row;

const toCellIndex = (cellCoords: Record<DxGridAxis, number>): CellIndex => `${cellCoords.col},${cellCoords.row}`;

const cellTotalOffset = (cellElement: HTMLElement | null): { inline: number; block: number } => {
  if (!cellElement) {
    return { inline: NaN, block: NaN };
  }
  const contentElement = cellElement.offsetParent as HTMLElement;
  // Note that storing `offset` in state causes performance issues, so instead the transform is parsed here.
  const [_translate3d, inlineStr, blockStr] = contentElement.style.transform.split(/[()]|px,?\s?/);
  const contentOffsetInline = parseFloat(inlineStr);
  const contentOffsetBlock = parseFloat(blockStr);
  const offsetParent = (contentElement.offsetParent as HTMLElement).offsetParent as HTMLElement;
  return {
    inline: cellElement.offsetLeft + contentOffsetInline + offsetParent.offsetLeft,
    block: cellElement.offsetTop + contentOffsetBlock + offsetParent.offsetTop,
  };
};

const localChId = (c0: number) => `ch--${c0}`;
const localRhId = (r0: number) => `rh--${r0}`;

const getPage = (axis: string, event: PointerEvent) => (axis === 'col' ? event.pageX : event.pageY);

@customElement('dx-grid')
export class DxGrid extends LitElement {
  @property({ type: Object })
  rowDefault: AxisMeta = { size: 32 };

  @property({ type: Object })
  columnDefault: AxisMeta = { size: 180 };

  @property({ type: Object })
  rows: Record<string, AxisMeta> = {};

  @property({ type: Object })
  columns: Record<string, AxisMeta> = {};

  @property({ type: Object })
  cells: Record<CellIndex, CellValue> = {};

  //
  // `pos`, short for ‘position’, is the position in pixels of the viewport from the origin.
  //

  @state()
  posInline = 0;

  @state()
  posBlock = 0;

  //
  // `size` (when not suffixed with ‘row’ or ‘col’, see above) is the size in pixels of the viewport.
  //

  @state()
  sizeInline = 0;

  @state()
  sizeBlock = 0;

  //
  // `overscan` is the amount in pixels to offset the grid content due to the number of overscanned columns or rows.
  //

  @state()
  overscanInline = 0;

  @state()
  overscanBlock = 0;

  //
  // `bin`, not short for anything, is the range in pixels within which virtualization does not need to reassess.
  //

  @state()
  binInlineMin = 0;

  @state()
  binInlineMax = this.colSize(0);

  @state()
  binBlockMin = 0;

  @state()
  binBlockMax = this.rowSize(0);

  //
  // `vis`, short for ‘visible’, is the range in numeric index of the columns or rows which should be rendered within
  // the viewport. These start with naïve values that are updated before first contentful render.
  //

  @state()
  visColMin = 0;

  @state()
  visColMax = 1;

  @state()
  visRowMin = 0;

  @state()
  visRowMax = 1;

  //
  // `template` is the rendered value of `grid-{axis}-template`.
  //
  @state()
  templateColumns = `${this.colSize(0)}px`;

  @state()
  templateRows = `${this.rowSize(0)}px`;

  //
  // Resize state and handlers
  //

  @state()
  colSizes: Record<string, number> = {};

  @state()
  rowSizes: Record<string, number> = {};

  @state()
  resizing: null | (DxAxisResizeProps & { page: number }) = null;

  handlePointerDown = (event: PointerEvent) => {
    const { action, actionEl } = closestAction(event.target);
    if (action) {
      if (action.startsWith('resize')) {
        const [resize, index] = action.split(',');
        const [_, axis] = resize.split('-');
        this.resizing = {
          axis: axis as DxGridAxis,
          size: axis === 'col' ? this.colSize(index) : this.rowSize(index),
          page: getPage(axis, event),
          index,
        };
      } else if (action === 'cell') {
        const cellCoords = closestCell(event.target, actionEl);
        if (this.focusActive && isSameCell(this.focusedCell, cellCoords)) {
          this.dispatchEvent(
            new DxEditRequest({
              cellIndex: toCellIndex(cellCoords!),
              totalOffset: cellTotalOffset(this.getFocusedCellElement()),
            }),
          );
        }
      }
    }
  };

  handlePointerUp = (_event: PointerEvent) => {
    if (this.resizing) {
      const resizeEvent = new DxAxisResize({
        axis: this.resizing.axis,
        index: this.resizing.index,
        size: this[this.resizing.axis === 'col' ? 'colSize' : 'rowSize'](this.resizing.index),
      });
      this.dispatchEvent(resizeEvent);
      this.resizing = null;
    }
  };

  handlePointerMove = (event: PointerEvent) => {
    if (this.resizing) {
      const delta = getPage(this.resizing.axis, event) - this.resizing.page;
      if (this.resizing.axis === 'col') {
        const nextSize = Math.max(sizeColMin, Math.min(sizeColMax, this.resizing.size + delta));
        this.colSizes = { ...this.colSizes, [this.resizing.index]: nextSize };
        this.updateVisInline();
      } else {
        const nextSize = Math.max(sizeRowMin, Math.min(sizeRowMax, this.resizing.size + delta));
        this.rowSizes = { ...this.rowSizes, [this.resizing.index]: nextSize };
        this.updateVisBlock();
      }
    }
  };

  //
  // Accessors
  //

  private colSize(c: number | string) {
    return this.colSizes?.[c] ?? this.columnDefault.size;
  }

  private rowSize(r: number | string) {
    return this.rowSizes?.[r] ?? this.rowDefault.size;
  }

  private getCell(c: number | string, r: number | string) {
    return this.cells[`${c}${separator}${r}`];
  }

  //
  // Resize & reposition handlers, observer, ref
  //

  @state()
  observer = new ResizeObserver((entries) => {
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
    }
  });

  viewportRef: Ref<HTMLDivElement> = createRef();

  handleWheel = ({ deltaX, deltaY }: WheelEvent) => {
    this.posInline = Math.max(0, this.posInline + deltaX);
    this.posBlock = Math.max(0, this.posBlock + deltaY);
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

  private updateVisInline() {
    // todo: avoid starting from zero
    let colIndex = 0;
    let pxInline = this.colSize(colIndex);

    while (pxInline < this.posInline) {
      colIndex += 1;
      pxInline += this.colSize(colIndex) + gap;
    }

    this.visColMin = colIndex - overscanCol;

    this.binInlineMin = pxInline - this.colSize(colIndex) - gap;
    this.binInlineMax = pxInline + gap;

    this.overscanInline =
      [...Array(overscanCol)].reduce((acc, _, c0) => {
        acc += this.colSize(this.visColMin + c0);
        return acc;
      }, 0) +
      gap * (overscanCol - 1);

    while (pxInline < this.binInlineMax + this.sizeInline + gap) {
      colIndex += 1;
      pxInline += this.colSize(colIndex) + gap;
    }

    this.visColMax = colIndex + overscanCol;

    this.templateColumns = [...Array(this.visColMax - this.visColMin)]
      .map((_, c0) => `${this.colSize(this.visColMin + c0)}px`)
      .join(' ');
  }

  private updateVisBlock() {
    // todo: avoid starting from zero
    let rowIndex = 0;
    let pxBlock = this.rowSize(rowIndex);

    while (pxBlock < this.posBlock) {
      rowIndex += 1;
      pxBlock += this.rowSize(rowIndex) + gap;
    }

    this.visRowMin = rowIndex - overscanRow;

    this.binBlockMin = pxBlock - this.rowSize(rowIndex) - gap;
    this.binBlockMax = pxBlock + gap;

    this.overscanBlock =
      [...Array(overscanRow)].reduce((acc, _, r0) => {
        acc += this.rowSize(this.visRowMin + r0);
        return acc;
      }, 0) +
      gap * (overscanRow - 1);

    while (pxBlock < this.binBlockMax + this.sizeBlock) {
      rowIndex += 1;
      pxBlock += this.rowSize(rowIndex) + gap;
    }

    this.visRowMax = rowIndex + overscanRow;

    this.templateRows = [...Array(this.visRowMax - this.visRowMin)]
      .map((_, r0) => `${this.rowSize(this.visRowMin + r0)}px`)
      .join(' ');
  }

  private updateVis() {
    this.updateVisInline();
    this.updateVisBlock();
  }

  // Focus handlers

  @state()
  focusedCell: Record<DxGridAxis, number> = { col: 0, row: 0 };

  @state()
  focusActive: boolean = false;

  @eventOptions({ capture: true })
  handleFocus(event: FocusEvent) {
    const cellCoords = closestCell(event.target);
    if (cellCoords && !isSameCell(this.focusedCell, cellCoords)) {
      this.focusedCell = cellCoords;
      this.focusActive = true;
    }
  }

  @eventOptions({ capture: true })
  handleBlur(event: FocusEvent) {
    // Only unset `focusActive` if focus is not moving to an element within the grid.
    if (
      !event.relatedTarget ||
      (event.relatedTarget as HTMLElement).closest('.dx-grid__viewport') !== this.viewportRef.value
    ) {
      this.focusActive = false;
    }
  }

  getFocusedCellElement() {
    return this.viewportRef.value?.querySelector(
      `[aria-colindex="${this.focusedCell.col}"][aria-rowindex="${this.focusedCell.row}"]`,
    ) as HTMLElement | null;
  }

  /**
   * Moves focus to the cell with actual focus, otherwise moves focus to the viewport.
   */
  refocus() {
    (this.focusedCell.row < this.visRowMin ||
    this.focusedCell.row > this.visRowMax ||
    this.focusedCell.col < this.visColMin ||
    this.focusedCell.col > this.visColMax
      ? this.viewportRef.value
      : this.getFocusedCellElement()
    )?.focus({ preventScroll: true });
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
        this.posInline = this.binInlineMin;
        this.updateVisInline();
      } else if (this.focusedCell.col >= this.visColMax - overscanCol - 1) {
        const sizeSumCol = [...Array(this.focusedCell.col - this.visColMin)].reduce((acc, _, c0) => {
          acc += this.colSize(this.visColMin + overscanCol + c0) + gap;
          return acc;
        }, 0);
        this.posInline = this.binInlineMin + sizeSumCol + gap * 2 - this.sizeInline;
        this.updateVisInline();
      }

      if (this.focusedCell.row <= this.visRowMin + overscanRow) {
        this.posBlock = this.binBlockMin;
        this.updateVisBlock();
      } else if (this.focusedCell.row >= this.visRowMax - overscanRow - 1) {
        const sizeSumRow = [...Array(this.focusedCell.row - this.visRowMin)].reduce((acc, _, r0) => {
          acc += this.rowSize(this.visRowMin + overscanRow + r0) + gap;
          return acc;
        }, 0);
        this.posBlock = this.binBlockMin + sizeSumRow + gap * 2 - this.sizeBlock;
        this.updateVisBlock();
      }
    }
  }

  // Keyboard interactions
  handleKeydown(event: KeyboardEvent) {
    if (this.focusActive) {
      // Adjust state
      switch (event.key) {
        case 'ArrowDown':
          this.focusedCell = { ...this.focusedCell, row: this.focusedCell.row + 1 };
          break;
        case 'ArrowUp':
          this.focusedCell = { ...this.focusedCell, row: Math.max(0, this.focusedCell.row - 1) };
          break;
        case 'ArrowRight':
          this.focusedCell = { ...this.focusedCell, col: this.focusedCell.col + 1 };
          break;
        case 'ArrowLeft':
          this.focusedCell = { ...this.focusedCell, col: Math.max(0, this.focusedCell.col - 1) };
          break;
      }
      // Emit interactions
      switch (event.key) {
        case 'Enter':
          this.dispatchEvent(
            new DxEditRequest({
              cellIndex: toCellIndex(this.focusedCell),
              totalOffset: cellTotalOffset(this.getFocusedCellElement()),
            }),
          );
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
  // Render and other lifecycle methods
  //

  override render() {
    const visibleCols = this.visColMax - this.visColMin;
    const visibleRows = this.visRowMax - this.visRowMin;
    const offsetInline = gap + this.binInlineMin - this.posInline - this.overscanInline;
    const offsetBlock = gap + this.binBlockMin - this.posBlock - this.overscanBlock;

    return html`<div
      role="none"
      class="dx-grid"
      @pointerdown=${this.handlePointerDown}
      @pointerup=${this.handlePointerUp}
      @pointermove=${this.handlePointerMove}
      @focus=${this.handleFocus}
      @blur=${this.handleBlur}
      @keydown=${this.handleKeydown}
    >
      <div role="none" class="dx-grid__corner"></div>
      <div role="none" class="dx-grid__columnheader">
        <div
          role="none"
          class="dx-grid__columnheader__content"
          style="transform:translate3d(${offsetInline}px,0,0);grid-template-columns:${this.templateColumns};"
        >
          ${[...Array(visibleCols)].map((_, c0) => {
            const c = this.visColMin + c0;
            return html`<div
              role="columnheader"
              ?inert=${c < 0}
              style="block-size:${this.rowDefault.size}px;grid-column:${c0 + 1}/${c0 + 2};"
            >
              <span id=${localChId(c0)}>${colToA1Notation(c)}</span>
              ${(this.columns[c]?.resizeable ?? this.columnDefault.resizeable) &&
              html`<button class="dx-grid__resize-handle" data-dx-grid-action=${`resize-col,${c}`}>
                <span class="sr-only">Resize</span>
              </button>`}
            </div>`;
          })}
        </div>
      </div>
      <div role="none" class="dx-grid__corner"></div>
      <div role="none" class="dx-grid__rowheader">
        <div
          role="none"
          class="dx-grid__rowheader__content"
          style="transform:translate3d(0,${offsetBlock}px,0);grid-template-rows:${this.templateRows};"
        >
          ${[...Array(visibleRows)].map((_, r0) => {
            const r = this.visRowMin + r0;
            return html`<div role="rowheader" ?inert=${r < 0} style="grid-row:${r0 + 1}/${r0 + 2}">
              <span id=${localRhId(r0)}>${rowToA1Notation(r)}</span>
              ${(this.rows[r]?.resizeable ?? this.rowDefault.resizeable) &&
              html`<button class="dx-grid__resize-handle" data-dx-grid-action=${`resize-row,${r}`}>
                <span class="sr-only">Resize</span>
              </button>`}
            </div>`;
          })}
        </div>
      </div>
      <div role="grid" class="dx-grid__viewport" tabindex="0" @wheel=${this.handleWheel} ${ref(this.viewportRef)}>
        <div
          role="none"
          class="dx-grid__content"
          style="transform:translate3d(${offsetInline}px,${offsetBlock}px,0);grid-template-columns:${this
            .templateColumns};grid-template-rows:${this.templateRows};"
        >
          ${[...Array(visibleCols)].map((_, c0) => {
            return [...Array(visibleRows)].map((_, r0) => {
              const c = c0 + this.visColMin;
              const r = r0 + this.visRowMin;
              const cell = this.getCell(c, r);
              return html`<div
                role="gridcell"
                tabindex="0"
                ?inert=${c < 0 || r < 0}
                aria-rowindex=${r}
                aria-colindex=${c}
                data-dx-grid-action="cell"
                style="grid-column:${c0 + 1};grid-row:${r0 + 1}"
              >
                ${cell?.value}
              </div>`;
            });
          })}
        </div>
      </div>
      <div role="none" class="dx-grid__scrollbar" aria-orientation="vertical">
        <div role="none" class="dx-grid__scrollbar__thumb"></div>
      </div>
      <div role="none" class="dx-grid__corner"></div>
      <div role="none" class="dx-grid__scrollbar" aria-orientation="horizontal">
        <div role="none" class="dx-grid__scrollbar__thumb"></div>
      </div>
      <div role="none" class="dx-grid__corner"></div>
    </div>`;
  }

  override firstUpdated() {
    this.observer.observe(this.viewportRef.value!);
    this.colSizes = Object.entries(this.columns).reduce((acc: Record<string, number>, [colId, colMeta]) => {
      if (colMeta?.size) {
        acc[colId] = colMeta.size;
      }
      return acc;
    }, {});
    this.rowSizes = Object.entries(this.rows).reduce((acc: Record<string, number>, [rowId, rowMeta]) => {
      if (rowMeta?.size) {
        acc[rowId] = rowMeta.size;
      }
      return acc;
    }, {});
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
