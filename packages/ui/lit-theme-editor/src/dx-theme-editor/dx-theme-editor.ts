//
// Copyright 2025 DXOS.org
//

import { type TokenSet } from '@ch-ui/tokens';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { restore } from './util';

export type DxThemeEditorProps = {};

const bindSeriesDefinitions = ['neutral', 'primary'];

@customElement('dx-theme-editor')
export class DxThemeEditor extends LitElement {
  @state()
  tokenSet: TokenSet = restore();

  override render() {
    return html`<span>Theme editor</span>`;
  }

  override createRenderRoot() {
    return this;
  }
}
