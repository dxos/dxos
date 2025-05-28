//
// Copyright 2025 DXOS.org
//

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

export type DxThemeEditorProps = {};

@customElement('dx-theme-editor')
export class DxThemeEditor extends LitElement {
  override render() {
    return html`<span>Theme editor</span>`;
  }

  override createRenderRoot() {
    return this;
  }
}
