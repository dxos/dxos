//
// Copyright 2025 DXOS.org
//

export const DX_ANCHOR_ACTIVATE = 'dx-anchor-activate';

/**
 * Global event to trigger a popover.
 */
export class DxAnchorActivate extends Event {
  public readonly refId: string;
  public readonly label: string;
  public readonly trigger: HTMLElement;
  constructor(props: { refId: string; label: string; trigger: HTMLElement }) {
    super(DX_ANCHOR_ACTIVATE);
    this.refId = props.refId;
    this.label = props.label;
    this.trigger = props.trigger;
  }
}
