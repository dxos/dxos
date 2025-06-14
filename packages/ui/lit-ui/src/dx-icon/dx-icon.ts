//
// Copyright 2025 DXOS.org
//

import { svg, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { type Size } from '../defs';

const ICONS_URL = '/icons.svg';

@customElement('dx-icon')
export class DxIcon extends LitElement {
  // TODO(thure): Get Hue type used in theme.
  @property({ type: String })
  size: Size = 4;

  @property({ type: String })
  icon: string = 'ph--placeholder--regular';

  @property({ type: Boolean })
  noCache: boolean = true;

  override render() {
    const url = this.noCache ? `${ICONS_URL}?nocache=${new Date().getMinutes()}` : ICONS_URL;
    const href = `${url}#${this.icon}`;
    return svg`<svg class="dx-icon" data-size=${this.size}><use href=${href} /></svg>`;
  }

  override createRenderRoot(): this {
    return this;
  }
}
