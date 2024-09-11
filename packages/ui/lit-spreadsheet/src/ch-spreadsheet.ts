//
// Copyright 2024 DXOS.org
//

import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';

import { colToA1Notation, posFromNumericNotation, rowToA1Notation } from './position';

const colSize = 64;

const rowSize = 20;

const gap = 0;

export type CellValue = {
  /**
   * The position (or topleft-most of the range) in numeric notation
   */
  pos: string;
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

@customElement('ch-spreadsheet')
export class ChSpreadsheet extends LitElement {
  @property({ type: Object })
  values: Record<string, CellValue> = {};

  @state()
  posInline = 0;

  @state()
  posBlock = 0;

  @state()
  sizeInline = 0;

  @state()
  sizeBlock = 0;

  @state()
  cellByPosition: Record<string, string> = {};

  @state()
  observer = new ResizeObserver((entries) => {
    const { inlineSize, blockSize } = entries?.[0]?.contentBoxSize?.[0] ?? {
      inlineSize: 0,
      blockSize: 0,
    };
    this.sizeInline = inlineSize;
    this.sizeBlock = blockSize;
  });

  viewportRef: Ref<HTMLDivElement> = createRef();

  handleWheel = ({ deltaX, deltaY }: WheelEvent) => {
    this.posInline = Math.max(0, this.posInline + deltaX);
    this.posBlock = Math.max(0, this.posBlock + deltaY);
  };

  override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('values')) {
      // console.log('[computing cellByPosition]');
      this.cellByPosition = Object.entries(this.values).reduce((acc: Record<string, string>, [id, { pos, end }]) => {
        const { i: i1, j: j1 } = posFromNumericNotation(pos);
        if (end) {
          const { i: i2, j: j2 } = posFromNumericNotation(end);
          for (let ci = i1; ci <= i2; ci += 1) {
            for (let cj = j1; cj <= j2; cj += 1) {
              acc[`${ci},${cj}`] = id;
            }
          }
        } else {
          acc[`${i1},${j1}`] = id;
        }
        return acc;
      }, {});
    }
  }

  private getCell(i: number, j: number) {
    const pos = `${i},${j}`;
    const cellId = this.cellByPosition[pos];
    return cellId ? this.values[cellId] : undefined;
  }

  private computeExtrema() {
    const colVisMin = Math.floor(this.posInline / (colSize + gap));
    const colVisMax = Math.ceil((this.sizeInline + this.posInline) / (colSize + gap));

    const rowVisMin = Math.floor(this.posBlock / (rowSize + gap));
    const rowVisMax = Math.ceil((this.sizeBlock + this.posBlock) / (rowSize + gap));

    const { colExtMin, colExtMax } = [...Array(rowVisMax - rowVisMin)].reduce(
      (acc, _, j) => {
        const colVisMinCell = this.getCell(colVisMin, j + rowVisMin);
        if (colVisMinCell?.end) {
          const { i: iStart } = posFromNumericNotation(colVisMinCell.pos);
          acc.colExtMin = Math.min(acc.colExtMin, iStart);
        }
        const colVisMaxCell = this.getCell(colVisMax, j + rowVisMin);
        if (colVisMaxCell?.end) {
          const { i: iEnd } = posFromNumericNotation(colVisMaxCell.end);
          acc.colExtMax = Math.max(acc.colExtMax, iEnd);
        }
        return acc;
      },
      { colExtMin: colVisMin, colExtMax: colVisMax },
    );

    const { rowExtMin, rowExtMax } = [...Array(colVisMax - colVisMin)].reduce(
      (acc, _, i) => {
        const rowVisMinCell = this.getCell(i + colVisMin, rowVisMin);
        if (rowVisMinCell?.end) {
          const { j: jStart } = posFromNumericNotation(rowVisMinCell.pos);
          acc.rowExtMin = Math.min(acc.rowExtMin, jStart);
        }
        const rowVisMaxCell = this.getCell(i + colVisMin, rowVisMax);
        if (rowVisMaxCell?.end) {
          const { j: jEnd } = posFromNumericNotation(rowVisMaxCell.end);
          acc.rowExtMax = Math.max(acc.rowExtMax, jEnd);
        }
        return acc;
      },
      { rowExtMin: rowVisMin, rowExtMax: rowVisMax },
    );

    return {
      colVisMin,
      colExtMin,
      colVisMax,
      colExtMax,
      rowVisMin,
      rowExtMin,
      rowVisMax,
      rowExtMax,
    };
  }

  override render() {
    const { colVisMin, colVisMax, rowVisMin, rowVisMax } = this.computeExtrema();

    const visibleCols = colVisMax - colVisMin;
    const visibleRows = rowVisMax - rowVisMin;

    // TODO(thure): now compute the offset based on the extrema.
    const offsetInline = colVisMin * colSize - this.posInline;
    const offsetBlock = rowVisMin * rowSize - this.posBlock;

    return html`<div role="none" class="ch-spreadsheet">
      <div role="none" class="ch-spreadsheet__corner"></div>
      <div role="none" class="ch-spreadsheet__columnheader">
        <div
          role="none"
          class="ch-spreadsheet__columnheader__content"
          style="transform:translate3d(${offsetInline}px,0,0);grid-template-columns:repeat(${visibleCols},${colSize}px);"
        >
          ${[...Array(visibleCols)].map((_, i) => {
            return html`<div
              role="gridcell"
              style="inline-size:${colSize}px;block-size:${rowSize}px;grid-column:${i + 1}/${i + 2};"
            >
              ${colToA1Notation(colVisMin + i)}
            </div>`;
          })}
        </div>
      </div>
      <div role="none" class="ch-spreadsheet__corner"></div>
      <div role="none" class="ch-spreadsheet__rowheader">
        <div
          role="none"
          class="ch-spreadsheet__rowheader__content"
          style="transform:translate3d(0,${offsetBlock}px,0);"
        >
          ${[...Array(visibleRows)].map((_, j) => {
            return html`<div role="gridcell" style="block-size:${rowSize}px;grid-row:${j + 1}/${j + 2}">
              ${rowToA1Notation(rowVisMin + j)}
            </div>`;
          })}
        </div>
      </div>
      <div role="none" class="ch-spreadsheet__viewport" @wheel="${this.handleWheel}" ${ref(this.viewportRef)}>
        <div
          role="grid"
          class="ch-spreadsheet__content"
          style="transform:translate3d(${offsetInline}px,${offsetBlock}px,0);grid-template-columns:repeat(${visibleCols},${colSize}px);grid-template-rows:repeat(${visibleRows},${rowSize}px);"
        >
          ${[...Array(visibleCols)].map((_, i) => {
            return [...Array(visibleRows)].map((_, j) => {
              const posAbs = `${i + colVisMin},${j + rowVisMin}`;
              const cellId = this.cellByPosition[posAbs];
              const cell = cellId ? this.values[cellId] : undefined;
              if (cell?.end) {
                // This is a merged cell
                if (posAbs !== cell?.pos) {
                  // Don’t render subcells within the merge if not at the start (probably)
                  return null;
                } else {
                  // Render the full merged cell
                  const { i: iEndAbs, j: jEndAbs } = posFromNumericNotation(cell.end);
                  return html`<div
                    role="gridcell"
                    style="grid-column:${i + 1} / ${iEndAbs - colVisMin + 2};grid-row:${j + 1} / ${jEndAbs -
                    rowVisMin +
                    2}"
                  >
                    ${cell?.value}
                  </div>`;
                }
              } else {
                return html`<div role="gridcell" style="grid-column:${i + 1};grid-row:${j + 1}">${cell?.value}</div>`;
              }
            });
          })}
        </div>
      </div>
      <div role="none" class="ch-spreadsheet__scrollbar" aria-orientation="vertical">
        <div role="none" class="ch-spreadsheet__scrollbar__thumb"></div>
      </div>
      <div role="none" class="ch-spreadsheet__corner"></div>
      <div role="none" class="ch-spreadsheet__scrollbar" aria-orientation="horizontal">
        <div role="none" class="ch-spreadsheet__scrollbar__thumb"></div>
      </div>
      <div role="none" class="ch-spreadsheet__corner"></div>
    </div>`;
  }

  override firstUpdated() {
    this.observer.observe(this.viewportRef.value!);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    console.log('[disconnected]', this.viewportRef.value);
    // TODO(thure): Will this even work?
    if (this.viewportRef.value) {
      this.observer.unobserve(this.viewportRef.value);
    }
  }

  override createRenderRoot() {
    return this;
  }
}
