//
// Copyright 2025 DXOS.org
//

export class DxAnchorActivate extends Event {
  public readonly refId: string;
  public readonly label: string;
  public readonly trigger: HTMLElement;
  constructor(props: { refId: string; label: string; trigger: HTMLElement }) {
    super('dx-anchor-activate');
    this.refId = props.refId;
    this.label = props.label;
    this.trigger = props.trigger;
  }
}
