//
// Copyright 2025 DXOS.org
//

import { type TokenSet } from '@ch-ui/tokens';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { debounce } from '@dxos/async';

import { restore, saveAndRender } from './util';

import './dx-range-spinbutton';
import './dx-theme-editor.pcss';

export type DxThemeEditorSemanticColorsProps = {};

@customElement('dx-theme-editor-semantic-colors')
export class DxThemeEditorSemanticColors extends LitElement {
  @state()
  tokenSet: TokenSet = restore();

  private debouncedSaveAndRender = debounce(() => {
    saveAndRender(this.tokenSet);
  }, 200);

  private getPhysicalColorSeries(): string[] {
    if (!this.tokenSet.colors?.physical?.series) {
      return [];
    }

    return Object.keys(this.tokenSet.colors.physical.series);
  }

  private getSemanticTokens(): [string, any][] {
    if (!this.tokenSet.colors?.semantic?.sememes) {
      return [];
    }

    return Object.entries(this.tokenSet.colors.semantic.sememes);
  }

  private updateSemanticToken(tokenName: string, condition: 'light' | 'dark', property: 0 | 1, value: any) {
    if (!this.tokenSet.colors?.semantic?.sememes?.[tokenName]?.[condition]) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));

    // Update the specific property
    updatedTokenSet.colors.semantic.sememes[tokenName][condition][property] = value;

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private handleTokenNameChange(tokenName: string, newName: string) {
    if (!this.tokenSet.colors?.semantic?.sememes?.[tokenName]) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));

    // Get the token value
    const tokenValue = updatedTokenSet.colors.semantic.sememes[tokenName];

    // Delete the old token
    delete updatedTokenSet.colors.semantic.sememes[tokenName];

    // Add the token with the new name
    updatedTokenSet.colors.semantic.sememes[newName] = tokenValue;

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private handleSeriesChange(tokenName: string, condition: 'light' | 'dark', value: string) {
    this.updateSemanticToken(tokenName, condition, 0, value);
  }

  private handleLuminosityChange(tokenName: string, condition: 'light' | 'dark', value: number) {
    this.updateSemanticToken(tokenName, condition, 1, value);
  }


  private renderTokenControls(tokenName: string, tokenValue: any) {
    const physicalColorSeries = this.getPhysicalColorSeries();
    const lightSeries = tokenValue.light?.[0] || '';
    const lightLuminosity = tokenValue.light?.[1] || 0;
    const darkSeries = tokenValue.dark?.[0] || '';
    const darkLuminosity = tokenValue.dark?.[1] || 0;

    // Create unique IDs for headings to reference in aria-labelledby
    const tokenHeadingId = `${tokenName}-heading`;
    const lightHeadingId = `${tokenName}-light-heading`;
    const darkHeadingId = `${tokenName}-dark-heading`;

    return html`
      <div class="token-controls">
        <h3 id="${tokenHeadingId}" class="token-title">
          <input
            type="text"
            class="token-name-input dx-focus-ring"
            .value=${tokenName}
            @change=${(e: Event) => this.handleTokenNameChange(tokenName, (e.target as HTMLInputElement).value)}
            aria-label="Token name"
          />
        </h3>

        <div class="control-group">
          <h4 id="${lightHeadingId}" class="control-group-title">Light Condition</h4>
          <div class="control-row">
            <label class="control-label" for="${tokenName}-light-series">Series:</label>
            <select
              id="${tokenName}-light-series"
              class="series-select dx-focus-ring"
              .value=${lightSeries}
              @change=${(e: Event) =>
                this.handleSeriesChange(tokenName, 'light', (e.target as HTMLSelectElement).value)}
              aria-labelledby="${lightHeadingId} ${tokenName}-light-series-label"
            >
              ${physicalColorSeries.map(
                (series) => html`<option value="${series}" ?selected=${series === lightSeries}>${series}</option>`,
              )}
            </select>
          </div>
          <dx-range-spinbutton
            label="Luminosity"
            min="0"
            max="1000"
            step="1"
            .value=${lightLuminosity}
            headingId=${lightHeadingId}
            @value-changed=${(e: CustomEvent) => this.handleLuminosityChange(tokenName, 'light', e.detail.value)}
          ></dx-range-spinbutton>
        </div>

        <div class="control-group">
          <h4 id="${darkHeadingId}" class="control-group-title">Dark Condition</h4>
          <div class="control-row">
            <label class="control-label" for="${tokenName}-dark-series">Series:</label>
            <select
              id="${tokenName}-dark-series"
              class="series-select dx-focus-ring"
              .value=${darkSeries}
              @change=${(e: Event) => this.handleSeriesChange(tokenName, 'dark', (e.target as HTMLSelectElement).value)}
              aria-labelledby="${darkHeadingId} ${tokenName}-dark-series-label"
            >
              ${physicalColorSeries.map(
                (series) => html`<option value="${series}" ?selected=${series === darkSeries}>${series}</option>`,
              )}
            </select>
          </div>
          <dx-range-spinbutton
            label="Luminosity"
            min="0"
            max="1000"
            step="1"
            .value=${darkLuminosity}
            headingId=${darkHeadingId}
            @value-changed=${(e: CustomEvent) => this.handleLuminosityChange(tokenName, 'dark', e.detail.value)}
          ></dx-range-spinbutton>
        </div>
      </div>
    `;
  }

  override connectedCallback() {
    super.connectedCallback();
    saveAndRender(this.tokenSet);
  }

  override render() {
    const semanticTokens = this.getSemanticTokens();

    return html`
      <div class="theme-editor-container">
        <h2>Semantic Colors</h2>
        ${semanticTokens.map(
          ([tokenName, tokenValue]) => html`
            <div class="token-container">${this.renderTokenControls(tokenName, tokenValue)}</div>
          `,
        )}
      </div>
    `;
  }

  override createRenderRoot() {
    return this;
  }
}
