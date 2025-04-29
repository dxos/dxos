//
// Copyright 2025 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { makeId } from '@dxos/react-hooks';

export class DxRefTagActivate extends Event {
  public readonly itemId: string;
  constructor(props: { itemId: string }) {
    super('dx-ref-tag-activate');
    this.itemId = props.itemId;
  }
}

@customElement('dx-ref-tag')
export class DxRefTag extends LitElement {
  // TODO(thure): Get Hue type used in theme.
  @property({ type: String })
  hue: string = 'neutral';

  @property({ type: String })
  itemId: string = makeId('dx-ref-tag');

  @property({ type: String })
  label: string = 'never';

  @property({ type: String })
  rootClassName: string | undefined = undefined;

  private handleActivate() {
    this.dispatchEvent(new DxRefTagActivate({ itemId: this.itemId }));
  }

  override render() {
    const className = `dx-tag dx-focus-ring dx-ref-tag${this.rootClassName ? ` ${this.rootClassName}` : ''}`;
    return html`<button
      class=${className}
      data-hue=${this.hue}
      id=${this.id}
      @click=${this.handleActivate}
      @focus=${this.handleActivate}
    >
      ${this.label}
    </button>`;
  }

  override createRenderRoot() {
    return this;
  }
}
