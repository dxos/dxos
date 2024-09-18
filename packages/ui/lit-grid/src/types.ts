//
// Copyright 2024 DXOS.org
//

export type CellIndex = `${string},${string}`;

export type DxGridAxis = 'row' | 'col';

export type DxGridPosition = Record<DxGridAxis, number>;
export type DxGridPositionNullable = DxGridPosition | null;

export type DxAxisResizeProps = Pick<DxAxisResize, 'axis' | 'index' | 'size'>;

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

export type DxEditRequestProps = Pick<DxEditRequest, 'cellIndex'>;

export class DxEditRequest extends Event {
  public readonly cellIndex: CellIndex;
  constructor(props: DxEditRequestProps) {
    super('dx-edit-request');
    this.cellIndex = props.cellIndex;
  }
}
