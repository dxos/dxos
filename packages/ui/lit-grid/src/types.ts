//
// Copyright 2024 DXOS.org
//

export type DxGridAxis = 'row' | 'col';

export type DxAxisResizeProps = Pick<DxAxisResize, 'axis' | 'index' | 'size'>;

export class DxAxisResize extends Event {
  constructor(props: DxAxisResizeProps) {
    super('dx-axis-resize');
    this.axis = props.axis;
    this.index = props.index;
    this.size = props.size;
  }

  public readonly axis: DxGridAxis;
  public readonly index: string;
  public readonly size: number;
}
