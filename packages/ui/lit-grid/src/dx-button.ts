//
// Copyright 2024 DXOS.org
//

import { html, LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';

@customElement('dx-button')
export class ButtonElement extends LitElement {
  @property({ type: String })
  icon: string = 'ph--placeholder--regular';

  override render() {
    return html`<button class="${this.className}">
      <svg>
        <use href="/icons.svg#${this.icon}" />
      </svg>
    </button>`;
  }
}
