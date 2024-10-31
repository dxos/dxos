//
// Copyright 2024 DXOS.org
//

import { type DxGrid } from './dx-grid';
import { toCellIndex } from './util';

export type DxGridCellIndex = `${string},${string}`;

export type DxGridAxis = 'row' | 'col';

export type DxGridFrozenColsPlane = `frozenCols${'Start' | 'End'}`;
export type DxGridFrozenRowsPlane = `frozenRows${'Start' | 'End'}`;

export type DxGridFrozenPlane = DxGridFrozenColsPlane | DxGridFrozenRowsPlane;
export type DxGridFixedPlane = `fixed${'Start' | 'End'}${'Start' | 'End'}`;

export type DxGridPlane = 'grid' | DxGridFrozenPlane | DxGridFixedPlane;
export type DxGridPlaneRecord<P extends Exclude<DxGridPlane, 'grid'>, T> = Record<'grid', T> & Partial<Record<P, T>>;

export type DxGridPlanePosition = Record<DxGridAxis, number>;
export type DxGridPosition = DxGridPlanePosition & { plane: DxGridPlane };
export type DxGridPositionNullable = DxGridPosition | null;

export type DxGridAnnotatedWheelEvent = WheelEvent &
  Partial<{
    overscrollInline: number;
    overscrollBlock: number;
  }>;

export type DxGridPlaneCells = Record<DxGridCellIndex, DxGridCellValue>;
export type DxGridCells = { grid: DxGridPlaneCells } & Partial<
  Record<DxGridFixedPlane | DxGridFrozenPlane, DxGridPlaneCells>
>;

export type DxGridPlaneAxisMeta = Record<string, DxGridAxisMetaProps>;
export type DxGridAxisMeta = DxGridPlaneRecord<DxGridFrozenPlane, DxGridPlaneAxisMeta>;

export type DxGridPointer =
  | null
  | ({ state: 'maybeSelecting' } & Pick<PointerEvent, 'pageX' | 'pageY'>)
  | { state: 'selecting' };

export type DxAxisResizeProps = Pick<DxAxisResize, 'axis' | 'plane' | 'index' | 'size'>;
export type DxAxisResizeInternalProps = DxAxisResizeProps & { delta: number; state: 'dragging' | 'dropped' };

export type DxGridMode = 'browse' | 'edit' | 'edit-select';

export type DxGridFrozenAxes = Partial<Record<DxGridFrozenPlane, number>>;

export type DxGridCellValue = {
  /**
   * The content value
   */
  value?: string;
  /**
   * Accessory HTML to render alongside the value.
   */
  accessoryHtml?: string;
  /**
   * If this is a merged cell, the bottomright-most of the range in numeric notation, otherwise undefined.
   */
  end?: string;
  /**
   * `class` attribute value to apply to the gridcell element.
   */
  className?: string;
  /**
   * `data-refs` attribute to apply to the gridcell element.
   */
  dataRefs?: string;
  /**
   * Whether to render a resize handle for this cell’s row or column.
   */
  resizeHandle?: DxGridAxis;
  /**
   * Whether this cell is read-only.
   */
  readonly?: boolean;
};

export type DxGridAxisMetaProps = {
  size: number;
  description?: string;
  resizeable?: boolean;
  readonly?: boolean;
};

export type DxGridAxisSizes = DxGridPlaneRecord<DxGridFrozenPlane, Record<string, number>>;

export type DxGridProps = Partial<
  Pick<
    DxGrid,
    | 'gridId'
    | 'rowDefault'
    | 'columnDefault'
    | 'rows'
    | 'columns'
    | 'initialCells'
    | 'mode'
    | 'limitColumns'
    | 'limitRows'
    | 'frozen'
    | 'overscroll'
    | 'activeRefs'
  >
>;

export type DxGridSelectionProps = {
  plane: DxGridPlane;
  colMin: number;
  colMax: number;
  rowMin: number;
  rowMax: number;
  visible?: boolean;
};

export class DxAxisResize extends Event {
  public readonly axis: DxGridAxis;
  public readonly plane: 'grid' | DxGridFrozenPlane;
  public readonly index: string;
  public readonly size: number;
  constructor(props: DxAxisResizeProps) {
    super('dx-axis-resize');
    this.axis = props.axis;
    this.plane = props.plane;
    this.index = props.index;
    this.size = props.size;
  }
}

export class DxAxisResizeInternal extends Event {
  public readonly axis: DxGridAxis;
  public readonly plane: 'grid' | DxGridFrozenPlane;
  public readonly index: string;
  public readonly size: number;
  public readonly delta: number;
  public readonly state: 'dragging' | 'dropped';
  constructor(props: DxAxisResizeInternalProps) {
    super('dx-axis-resize-internal', { composed: true, bubbles: true });
    this.axis = props.axis;
    this.plane = props.plane;
    this.index = props.index;
    this.size = props.size;
    this.delta = props.delta;
    this.state = props.state;
  }
}

export type DxEditRequestProps = Pick<DxEditRequest, 'cellIndex' | 'cellBox' | 'initialContent'>;

export class DxEditRequest extends Event {
  public readonly cellIndex: DxGridCellIndex;
  public readonly cellBox: Record<'insetInlineStart' | 'insetBlockStart' | 'inlineSize' | 'blockSize', number>;
  public readonly initialContent?: string;
  constructor(props: DxEditRequestProps) {
    super('dx-edit-request');
    this.cellIndex = props.cellIndex;
    this.cellBox = props.cellBox;
    this.initialContent = props.initialContent;
  }
}

export type DxGridPlaneRange = { start: DxGridPlanePosition; end: DxGridPlanePosition };
export type DxGridRange = { start: DxGridPosition; end: DxGridPosition };

export class DxGridCellsSelect extends Event {
  public readonly start: string;
  public readonly end: string;
  public readonly minCol: number;
  public readonly maxCol: number;
  public readonly minRow: number;
  public readonly maxRow: number;
  constructor({ start, end }: DxGridRange) {
    super('dx-grid-cells-select');
    this.start = toCellIndex(start);
    this.end = toCellIndex(end);
    this.minCol = Math.min(start.col, end.col);
    this.maxCol = Math.max(start.col, end.col);
    this.minRow = Math.min(start.row, end.row);
    this.maxRow = Math.max(start.row, end.row);
  }
}
