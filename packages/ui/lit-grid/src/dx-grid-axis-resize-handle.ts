//
// Copyright 2024 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { type DxGridAxis } from './types';

@customElement('dx-grid-axis-resize-handle')
export class DxGridAxisResizeHandle extends LitElement {
  @property({ type: String })
  axis: DxGridAxis = 'row';

  @property({ type: String })
  index: string = '-1';

  override render() {
    return html`<button class="dx-grid__resize-handle" data-dx-grid-action=${`resize-${this.axis},${this.index}`}>
      <span class="sr-only">Resize</span>
    </button>`;
  }

  override createRenderRoot() {
    return this;
  }
}
