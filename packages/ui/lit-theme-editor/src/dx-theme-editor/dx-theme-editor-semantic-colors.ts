//
// Copyright 2025 DXOS.org
//

import { type AlphaLuminosity } from '@ch-ui/colors';
import { type TokenSet, parseAlphaLuminosity } from '@ch-ui/tokens';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { debounce } from '@dxos/async';

import { restore, saveAndRender } from './util';

import './dx-range-spinbutton';
import './dx-theme-editor.pcss';

export type DxThemeEditorSemanticColorsProps = {};

const isAlphaLuminosity = (value: any): value is AlphaLuminosity => {
  return Number.isFinite(value) || (typeof value === 'string' && value.includes('/'));
};

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

  private handleBothSeriesChange(tokenName: string, value: string) {
    // Update both light and dark series values
    this.updateSemanticToken(tokenName, 'light', 0, value);
    this.updateSemanticToken(tokenName, 'dark', 0, value);
  }

  private handleLuminosityChange(tokenName: string, condition: 'light' | 'dark', value: number) {
    // Get the current value to preserve alpha if it exists
    const currentValue = this.tokenSet.colors?.semantic?.sememes?.[tokenName]?.[condition]?.[1];
    if (!isAlphaLuminosity(currentValue)) {
      return;
    }

    // Parse the current value to get the alpha component
    const [, alpha] = parseAlphaLuminosity(currentValue);

    // If alpha is defined and not 1, use the format "luminosity/alpha"
    // Otherwise, just use the luminosity value
    const newValue = alpha !== undefined && alpha !== 1 ? `${value}/${alpha}` : value;

    this.updateSemanticToken(tokenName, condition, 1, newValue);
  }

  private handleAlphaChange(tokenName: string, value: number) {
    // Update both light and dark conditions
    ['light', 'dark'].forEach((condition) => {
      const currentValue = this.tokenSet.colors?.semantic?.sememes?.[tokenName]?.[condition as 'light' | 'dark']?.[1];
      if (!isAlphaLuminosity(currentValue)) {
        return;
      }

      // Parse the current value to get the luminosity component
      const [luminosity] = parseAlphaLuminosity(currentValue);

      // If alpha is 1 (default), just use the luminosity value
      // Otherwise, use the format "luminosity/alpha"
      const newValue = value === 1 ? luminosity : `${luminosity}/${value}`;

      this.updateSemanticToken(tokenName, condition as 'light' | 'dark', 1, newValue);
    });
  }

  private renderTokenControls(tokenName: string, tokenValue: any) {
    const physicalColorSeries = this.getPhysicalColorSeries();
    const lightSeries = tokenValue.light?.[0] || '';
    const lightLuminosityValue = tokenValue.light?.[1] || 0;
    const darkSeries = tokenValue.dark?.[0] || '';
    const darkLuminosityValue = tokenValue.dark?.[1] || 0;

    // Parse the luminosity values to extract the alpha components
    const [lightLuminosity, lightAlpha] = parseAlphaLuminosity(lightLuminosityValue);
    const [darkLuminosity, darkAlpha] = parseAlphaLuminosity(darkLuminosityValue);

    // Use the same series for both light and dark
    const currentSeries = lightSeries || darkSeries;

    // Use the first defined alpha value, or default to 1
    const currentAlpha = lightAlpha !== undefined ? lightAlpha : darkAlpha !== undefined ? darkAlpha : 1;

    // Create unique IDs for headings to reference in aria-labelledby
    const tokenHeadingId = `${tokenName}-heading`;
    const lightHeadingId = `${tokenName}-light-heading`;
    const darkHeadingId = `${tokenName}-dark-heading`;
    const seriesSelectId = `${tokenName}-series`;

    return html`
      <h3 id="${tokenHeadingId}" class="token-title">
        <input
          type="text"
          class="token-name-input dx-focus-ring"
          .value=${tokenName}
          @change=${(e: Event) => this.handleTokenNameChange(tokenName, (e.target as HTMLInputElement).value)}
          aria-label="Token name"
        />
      </h3>
      <div class="token-header">
        <div class="token-series-select">
          <label class="control-label" for="${seriesSelectId}">Series:</label>
          <select
            id="${seriesSelectId}"
            class="series-select dx-focus-ring"
            .value=${currentSeries}
            @change=${(e: Event) => this.handleBothSeriesChange(tokenName, (e.target as HTMLSelectElement).value)}
            aria-labelledby="${tokenHeadingId}"
          >
            ${physicalColorSeries.map(
              (series) => html`<option value="${series}" ?selected=${series === currentSeries}>${series}</option>`,
            )}
          </select>
        </div>
        <dx-range-spinbutton
          label="Alpha"
          min="0"
          max="1"
          step="0.01"
          .value=${currentAlpha}
          headingId=${tokenHeadingId}
          @value-changed=${(e: CustomEvent) => this.handleAlphaChange(tokenName, e.detail.value)}
        ></dx-range-spinbutton>
      </div>

      <div class="control-group">
        <dx-range-spinbutton
          label="Dark shade number"
          min="0"
          max="1000"
          step="1"
          .value=${darkLuminosity}
          headingId=${darkHeadingId}
          @value-changed=${(e: CustomEvent) => this.handleLuminosityChange(tokenName, 'dark', e.detail.value)}
          variant="reverse-range"
        ></dx-range-spinbutton>
        <dx-range-spinbutton
          label="Light shade number"
          min="0"
          max="1000"
          step="1"
          .value=${lightLuminosity}
          headingId=${lightHeadingId}
          @value-changed=${(e: CustomEvent) => this.handleLuminosityChange(tokenName, 'light', e.detail.value)}
          variant="reverse-order"
        ></dx-range-spinbutton>
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
