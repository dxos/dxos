//
// Copyright 2025 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { makeId } from '@dxos/react-hooks';

export class DxRefTagActivate extends Event {
  public readonly ref: string;
  public readonly label: string;
  public readonly trigger: HTMLButtonElement;
  constructor(props: { ref: string; label: string; trigger: HTMLButtonElement }) {
    super('dx-ref-tag-activate');
    this.ref = props.ref;
    this.label = props.label;
    this.trigger = props.trigger;
  }
}

@customElement('dx-ref-tag')
export class DxRefTag extends LitElement {
  @property({ type: String })
  ref: string = makeId('dx-ref-tag');

  @property({ type: String })
  label: string = 'never';

  @property({ type: String })
  rootClassName: string | undefined = undefined;

  @property({ type: Number })
  hoverDelay: number = 400;

  @state()
  private hoverTimer: number | null = null;

  private handleActivate(event: { type: string }) {
    this.dispatchEvent(
      new DxRefTagActivate({ ref: this.ref, label: this.label, trigger: this.querySelector('[data-trigger]')! }),
    );
  }

  private handlePointerEnter() {
    if (this.hoverTimer !== null) {
      window.clearTimeout(this.hoverTimer);
    }
    this.hoverTimer = window.setTimeout(() => {
      this.handleActivate({ type: 'hover-linger' });
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
    const className = `dx-focus-ring dx-ref-tag${this.rootClassName ? ` ${this.rootClassName}` : ''}`;
    return html`<span
      tabindex="0"
      data-trigger="true"
      class=${className}
      id=${this.id}
      @click=${this.handleActivate}
      @pointerenter=${this.handlePointerEnter}
      @pointerleave=${this.handlePointerLeave}
      >${this.label}</span
    >`;
  }

  override createRenderRoot() {
    return this;
  }
}
