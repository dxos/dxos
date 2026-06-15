//
// Copyright 2025 DXOS.org
//

export const DX_ANCHOR_ACTIVATE = 'dx-anchor-activate';

export type DxAnchorActivateProps = {
  dxn: string;
  label: string;
  trigger: HTMLElement;
  kind?: 'base' | 'card';
  title?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  props?: Record<string, unknown>;
  /**
   * Set to `false` to close any open popover. When omitted (or `true`), the event opens a
   * popover anchored to `trigger`. `dxn` / `label` / `trigger` may be placeholders when
   * `state` is `false` — the close path ignores them.
   */
  state?: boolean;
};

/**
 * Global event to trigger a popover.
 */
export class DxAnchorActivate extends Event {
  public readonly dxn: string;
  public readonly label: string;
  public readonly trigger: HTMLElement;
  public readonly kind?: 'base' | 'card';
  public readonly title?: string;
  public readonly side?: 'top' | 'right' | 'bottom' | 'left';
  public readonly props?: Record<string, unknown>;
  public readonly state?: boolean;

  constructor(props: DxAnchorActivateProps) {
    super(DX_ANCHOR_ACTIVATE);
    this.dxn = props.dxn;
    this.label = props.label;
    this.trigger = props.trigger;
    this.kind = props.kind;
    this.title = props.title;
    this.side = props.side;
    this.props = props.props;
    this.state = props.state;
  }
}
