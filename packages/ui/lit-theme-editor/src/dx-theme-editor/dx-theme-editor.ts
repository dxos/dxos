//
// Copyright 2025 DXOS.org
//

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import './dx-theme-editor-physical-colors';
import './dx-theme-editor-semantic-colors';
import './dx-theme-editor.pcss';

export type DxThemeEditorProps = {};

@customElement('dx-theme-editor')
export class DxThemeEditor extends LitElement {
  @state()
  private activeTab: 'physical' | 'semantic' = 'physical';

  private handleTabClick(tab: 'physical' | 'semantic') {
    this.activeTab = tab;
  }

  override render() {
    return html`
      <div class="theme-editor-container">
        <div class="tabs-container" role="tablist">
          <button
            id="tab-physical"
            class=${classMap({ tab: true, active: this.activeTab === 'physical' })}
            role="tab"
            aria-selected=${this.activeTab === 'physical'}
            aria-controls="panel-physical"
            @click=${() => this.handleTabClick('physical')}
          >
            Physical
          </button>
          <button
            id="tab-semantic"
            class=${classMap({ tab: true, active: this.activeTab === 'semantic' })}
            role="tab"
            aria-selected=${this.activeTab === 'semantic'}
            aria-controls="panel-semantic"
            @click=${() => this.handleTabClick('semantic')}
          >
            Semantic
          </button>
        </div>

        <div
          id="panel-physical"
          class=${classMap({ 'tab-panel': true, active: this.activeTab === 'physical' })}
          role="tabpanel"
          aria-labelledby="tab-physical"
          ?hidden=${this.activeTab !== 'physical'}
        >
          <dx-theme-editor-physical-colors></dx-theme-editor-physical-colors>
        </div>

        <div
          id="panel-semantic"
          class=${classMap({ 'tab-panel': true, active: this.activeTab === 'semantic' })}
          role="tabpanel"
          aria-labelledby="tab-semantic"
          ?hidden=${this.activeTab !== 'semantic'}
        >
          <dx-theme-editor-semantic-colors></dx-theme-editor-semantic-colors>
        </div>
      </div>
    `;
  }

  override createRenderRoot() {
    return this;
  }
}
