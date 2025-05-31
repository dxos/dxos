//
// Copyright 2025 DXOS.org
//

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import './dx-theme-editor-physical-colors';
import './dx-theme-editor-semantic-colors';
import './dx-theme-editor-alias-colors';
import { reset, restore } from './util';

export type DxThemeEditorProps = {};

type Tab = 'physical' | 'semantic' | 'alias' | 'json' | 'reset';

@customElement('dx-theme-editor')
export class DxThemeEditor extends LitElement {
  @state()
  private activeTab: Tab = 'physical';

  private handleTabClick(tab: Tab) {
    this.activeTab = tab;
  }

  override render() {
    return html`
      <div class="theme-editor-container">
        <div class="tabs-container" role="tablist">
          <button
            id="tab-physical"
            class=${classMap({ 'dx-focus-ring': true, tab: true, active: this.activeTab === 'physical' })}
            role="tab"
            aria-selected=${this.activeTab === 'physical'}
            aria-controls="panel-physical"
            @click=${() => this.handleTabClick('physical')}
          >
            Physical
          </button>
          <button
            id="tab-semantic"
            class=${classMap({ 'dx-focus-ring': true, tab: true, active: this.activeTab === 'semantic' })}
            role="tab"
            aria-selected=${this.activeTab === 'semantic'}
            aria-controls="panel-semantic"
            @click=${() => this.handleTabClick('semantic')}
          >
            Semantic
          </button>
          <button
            id="tab-alias"
            class=${classMap({ 'dx-focus-ring': true, tab: true, active: this.activeTab === 'alias' })}
            role="tab"
            aria-selected=${this.activeTab === 'alias'}
            aria-controls="panel-alias"
            @click=${() => this.handleTabClick('alias')}
          >
            Alias
          </button>
          <button
            id="tab-json"
            class=${classMap({ 'dx-focus-ring': true, tab: true, active: this.activeTab === 'json' })}
            role="tab"
            aria-selected=${this.activeTab === 'json'}
            aria-controls="panel-json"
            @click=${() => this.handleTabClick('json')}
          >
            JSON
          </button>
          <button
            id="tab-reset"
            class=${classMap({ 'dx-focus-ring': true, tab: true, active: this.activeTab === 'reset' })}
            role="tab"
            aria-selected=${this.activeTab === 'reset'}
            aria-controls="panel-reset"
            @click=${() => this.handleTabClick('reset')}
          >
            Reset
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

        <div
          id="panel-alias"
          class=${classMap({ 'tab-panel': true, active: this.activeTab === 'alias' })}
          role="tabpanel"
          aria-labelledby="tab-alias"
          ?hidden=${this.activeTab !== 'alias'}
        >
          <dx-theme-editor-alias-colors></dx-theme-editor-alias-colors>
        </div>

        <div
          id="panel-json"
          class=${classMap({ 'tab-panel': true, active: this.activeTab === 'json' })}
          role="tabpanel"
          aria-labelledby="tab-json"
          ?hidden=${this.activeTab !== 'json'}
        >
          <textarea readonly>${JSON.stringify(restore(), null, 2)}</textarea>
        </div>

        <div
          id="panel-reset"
          class=${classMap({ 'tab-panel': true, active: this.activeTab === 'reset' })}
          role="tabpanel"
          aria-labelledby="tab-reset"
          ?hidden=${this.activeTab !== 'reset'}
        >
          <button class="dx-button dx-focus-ring" data-variant="destructive" @click=${() => reset()}>Reset</button>
        </div>
      </div>
    `;
  }

  override createRenderRoot() {
    return this;
  }
}
