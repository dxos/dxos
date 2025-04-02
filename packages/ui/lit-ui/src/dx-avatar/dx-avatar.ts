//
// Copyright 2025 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

export type DxAvatarProps = {};

@customElement('dx-avatar')
export class DxAvatar extends LitElement {
  override render() {
    return html`<span>Avatar</span>`;
  }

  override createRenderRoot() {
    return this;
  }
}
