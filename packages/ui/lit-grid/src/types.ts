//
// Copyright 2024 DXOS.org
//

import { type DxGrid } from './dx-grid';
import { toCellIndex } from './util';

export type CellIndex = `${string},${string}`;

export type DxGridAxis = 'row' | 'col';

export type DxGridPosition = Record<DxGridAxis, number>;
export type DxGridPositionNullable = DxGridPosition | null;

export type DxAxisResizeProps = Pick<DxAxisResize, 'axis' | 'index' | 'size'>;

export type DxGridMode = 'browse' | 'edit';

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
   * `class` attribute value to apply to the gridcell element
   */
  className?: string;
};

export type AxisMeta = {
  size: number;
  description?: string;
  resizeable?: boolean;
};

export type DxGridProps = Partial<Pick<DxGrid, 'cells' | 'rows' | 'columns' | 'rowDefault' | 'columnDefault'>>;

export class DxAxisResize extends Event {
  public readonly axis: DxGridAxis;
  public readonly index: string;
  public readonly size: number;
  constructor(props: DxAxisResizeProps) {
    super('dx-axis-resize');
    this.axis = props.axis;
    this.index = props.index;
    this.size = props.size;
  }
}

export type DxEditRequestProps = Pick<DxEditRequest, 'cellIndex' | 'cellBox' | 'initialContent'>;

export class DxEditRequest extends Event {
  public readonly cellIndex: CellIndex;
  public readonly cellBox: Record<'insetInlineStart' | 'insetBlockStart' | 'inlineSize' | 'blockSize', number>;
  public readonly initialContent?: string;
  constructor(props: DxEditRequestProps) {
    super('dx-edit-request');
    this.cellIndex = props.cellIndex;
    this.cellBox = props.cellBox;
    this.initialContent = props.initialContent;
  }
}

export type DxSelectProps = { start: DxGridPosition; end: DxGridPosition };

export class DxGridCellsSelect extends Event {
  public readonly start: string;
  public readonly end: string;
  public readonly minCol: number;
  public readonly maxCol: number;
  public readonly minRow: number;
  public readonly maxRow: number;
  constructor({ start, end }: DxSelectProps) {
    super('dx-grid-cells-select');
    this.start = toCellIndex(start);
    this.end = toCellIndex(end);
    this.minCol = Math.min(start.col, end.col);
    this.maxCol = Math.max(start.col, end.col);
    this.minRow = Math.min(start.row, end.row);
    this.maxRow = Math.max(start.row, end.row);
  }
}
