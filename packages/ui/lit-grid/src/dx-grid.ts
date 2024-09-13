//
// Copyright 2024 DXOS.org
//

import { LitElement, html } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';

import { colToA1Notation, posFromNumericNotation, rowToA1Notation, separator } from './position';

const resizeTolerance = 8;

export type CellValue = {
  /**
   * The content value
   */
  value: string;
  /**
   * If this is a merged cell, the bottomright-most of the range in numeric notation, otherwise undefined.
   */
  end?: string;
  /**
   * CSS inline styles to apply to the gridcell element
   */
  style?: string;
};

type AxisMeta = {
  size: number;
  description?: string;
} & ({ label: string } | { labelFallback: 'a1' });

@customElement('dx-grid')
export class DxGrid extends LitElement {
  @property({ type: Object })
  rowDefault: AxisMeta = { size: 32, labelFallback: 'a1' };

  @property({ type: Number })
  columnDefault: AxisMeta = { size: 180, labelFallback: 'a1' };

  @property({ type: Object })
  rows: Record<string, AxisMeta> = {};

  @property({ type: Object })
  columns: Record<string, AxisMeta> = {};

  @property({ type: Object })
  cells: Record<string, CellValue> = {};

  //
  // `pos`, short for ‘position’, is the position in pixels of the viewport from the origin.
  //

  @state()
  posInline = 0;

  @state()
  posBlock = 0;

  //
  // `size` is the size in pixels of the viewport.
  //

  @state()
  sizeInline = 0;

  @state()
  sizeBlock = 0;

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

  /**
   *
   */
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
      console.log('[resize]', inlineSize - this.sizeInline, blockSize - this.sizeBlock);
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
      console.log(
        '[wheel boundary]',
        [this.binInlineMin, this.posInline, this.binInlineMax],
        [this.binBlockMin, this.posBlock, this.binBlockMax],
      );
      this.updateVis();
    }
  };

  private colSize(c: number) {
    return this.columns[c]?.size ?? this.columnDefault.size;
  }

  private rowSize(r: number) {
    return this.rows[r]?.size ?? this.rowDefault.size;
  }

  private updateVis() {
    // inline-column axis
    // todo: avoid starting from zero
    let colIndex = 0;
    let pxInline = this.colSize(0);
    while (pxInline < this.posInline) {
      pxInline += this.colSize(colIndex);
      colIndex += 1;
    }
    this.visColMin = colIndex;
    this.binInlineMin = pxInline - this.colSize(this.visColMin);
    this.binInlineMax = pxInline;
    while (pxInline < this.posInline + this.sizeInline) {
      pxInline += this.colSize(colIndex);
      colIndex += 1;
    }
    this.visColMax = colIndex + 1;
    this.templateColumns = [...Array(this.visColMax - this.visColMin)]
      .map((c0) => `${this.colSize(this.visColMin + c0)}px`)
      .join(' ');

    // block-row axis
    // todo: avoid starting from zero
    let rowIndex = 0;
    let pxBlock = this.rowSize(0);
    while (pxBlock < this.posBlock) {
      pxBlock += this.rowSize(rowIndex);
      rowIndex += 1;
    }
    this.visRowMin = rowIndex;
    this.binBlockMin = pxBlock - this.rowSize(this.visRowMin);
    this.binBlockMax = pxBlock;
    while (pxBlock < this.posBlock + this.sizeBlock) {
      pxBlock += this.rowSize(rowIndex);
      rowIndex += 1;
    }
    this.visRowMax = rowIndex + 1;
    this.templateRows = [...Array(this.visRowMax - this.visRowMin)]
      .map((r0) => `${this.rowSize(this.visRowMin + r0)}px`)
      .join(' ');
  }

  private getCell(c: number, r: number) {
    return this.cells[`${c}${separator}${r}`];
  }

  override render() {
    const visibleCols = this.visColMax - this.visColMin;
    const visibleRows = this.visRowMax - this.visRowMin;
    const offsetInline = this.binInlineMin - this.posInline;
    const offsetBlock = this.binBlockMin - this.posBlock;

    return html`<div role="none" class="dx-grid">
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
              role="gridcell"
              style="inline-size:${this.colSize(c)}px;block-size:${this.rowDefault.size}px;grid-column:${c0 + 1}/${c0 +
              2};"
            >
              ${colToA1Notation(c)}
            </div>`;
          })}
        </div>
      </div>
      <div role="none" class="dx-grid__corner"></div>
      <div role="none" class="dx-grid__rowheader">
        <div role="none" class="dx-grid__rowheader__content" style="transform:translate3d(0,${offsetBlock}px,0);">
          ${[...Array(visibleRows)].map((_, r0) => {
            const r = this.visRowMin + r0;
            return html`<div role="gridcell" style="block-size:${this.rowSize(r)}px;grid-row:${r0 + 1}/${r0 + 2}">
              ${rowToA1Notation(r)}
            </div>`;
          })}
        </div>
      </div>
      <div role="none" class="dx-grid__viewport" @wheel="${this.handleWheel}" ${ref(this.viewportRef)}>
        <div
          role="grid"
          class="dx-grid__content"
          style="transform:translate3d(${offsetInline}px,${offsetBlock}px,0);grid-template-columns:${this
            .templateColumns};grid-template-rows:${this.templateRows};"
        >
          ${[...Array(visibleCols)].map((_, c) => {
            return [...Array(visibleRows)].map((_, r) => {
              const cell = this.getCell(c + this.visColMin, r + this.visRowMin);
              if (cell?.end) {
                // This is a merged cell
                // Render the full merged cell
                const { c: cEndAbs, r: rEndAbs } = posFromNumericNotation(cell.end);
                return html`<div
                  role="gridcell"
                  style="grid-column:${c + 1} / ${cEndAbs - this.visColMin + 2};grid-row:${r + 1} / ${rEndAbs -
                  this.visRowMin +
                  2}"
                >
                  ${cell?.value}
                </div>`;
              } else {
                return html`<div role="gridcell" style="grid-column:${c + 1};grid-row:${r + 1}">${cell?.value}</div>`;
              }
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
