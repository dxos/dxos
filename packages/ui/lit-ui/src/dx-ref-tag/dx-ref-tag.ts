//
// Copyright 2025 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { makeId } from '@dxos/react-hooks';

export class DxRefTagActivate extends Event {
  public readonly dxn: string;
  constructor(props: { dxn: string }) {
    super('dx-ref-tag-activate');
    this.dxn = props.dxn;
  }
}

@customElement('dx-ref-tag')
export class DxRefTag extends LitElement {
  // TODO(thure): Get Hue type used in theme.
  @property({ type: String })
  hue: string = 'neutral';

  @property({ type: String })
  dxn: string = makeId('dx-ref-tag');

  @property({ type: String })
  label: string = 'never';

  @property({ type: String })
  rootClassName: string | undefined = undefined;

  @property({ type: Number })
  hoverDelay: number = 400;

  @state()
  private hoverTimer: number | null = null;

  private handleActivate() {
    this.dispatchEvent(new DxRefTagActivate({ dxn: this.dxn }));
  }

  private handlePointerEnter() {
    if (this.hoverTimer !== null) {
      window.clearTimeout(this.hoverTimer);
    }
    this.hoverTimer = window.setTimeout(() => {
      this.handleActivate();
      this.hoverTimer = null;
    }, this.hoverDelay);
  }

  private handlePointerLeave() {
    if (this.hoverTimer !== null) {
      window.clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  override render() {
    const className = `dx-tag dx-focus-ring dx-ref-tag${this.rootClassName ? ` ${this.rootClassName}` : ''}`;
    return html`<button
      class=${className}
      data-hue=${this.hue}
      id=${this.id}
      @click=${this.handleActivate}
      @focus=${this.handleActivate}
      @pointerenter=${this.handlePointerEnter}
      @pointerleave=${this.handlePointerLeave}
    >
      ${this.label}
    </button>`;
  }

  override createRenderRoot() {
    return this;
  }
}
