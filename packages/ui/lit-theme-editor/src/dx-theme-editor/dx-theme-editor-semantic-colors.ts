//
// Copyright 2025 DXOS.org
//

import { type AlphaLuminosity } from '@ch-ui/colors';
import { type TokenSet, parseAlphaLuminosity } from '@ch-ui/tokens';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';

import { debounce } from '@dxos/async';
import { makeId } from '@dxos/react-hooks';

import { restore, saveAndRender, tokenSetUpdateEvent } from './util';

import './dx-range-spinbutton';

export type DxThemeEditorSemanticColorsProps = {};

const isAlphaLuminosity = (value: any): value is AlphaLuminosity =>
  Number.isFinite(value) || (typeof value === 'string' && value.includes('/'));

@customElement('dx-theme-editor-semantic-colors')
export class DxThemeEditorSemanticColors extends LitElement {
  @state()
  tokenSet: TokenSet = restore();

  @state()
  searchTerm: string = '';

  private debouncedSaveAndRender = debounce(() => {
    saveAndRender(this.tokenSet);
  }, 200);

  private handleTokenSetUpdate = () => {
    this.tokenSet = restore();
  };

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

  private updateSemanticToken(tokenName: string, condition: 'light' | 'dark', property: 0 | 1, value: any): void {
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

  private handleTokenNameChange(tokenName: string, newName: string): void {
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

  private handleSeriesChange(tokenName: string, condition: 'light' | 'dark', value: string): void {
    this.updateSemanticToken(tokenName, condition, 0, value);
  }

  private handleBothSeriesChange(tokenName: string, value: string): void {
    // Update both light and dark series values
    this.updateSemanticToken(tokenName, 'light', 0, value);
    this.updateSemanticToken(tokenName, 'dark', 0, value);
  }

  private handleLuminosityChange(tokenName: string, condition: 'light' | 'dark', value: number): void {
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

  private handleAlphaChange(tokenName: string, value: number): void {
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

  private addSemanticToken(): void {
    if (!this.tokenSet.colors?.semantic?.sememes) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));

    // Generate a random ID for the token name
    const tokenName = makeId('sememe--');

    // Create a new token with default values
    updatedTokenSet.colors.semantic.sememes[tokenName] = {
      light: ['neutral', 500],
      dark: ['neutral', 500],
    };

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private removeSemanticToken(tokenName: string): void {
    if (!this.tokenSet.colors?.semantic?.sememes?.[tokenName]) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));

    // Delete the token
    delete updatedTokenSet.colors.semantic.sememes[tokenName];

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private getAliasTokensForSemantic(tokenName: string): { condition: string; name: string }[] {
    if (!this.tokenSet.colors?.alias?.aliases?.[tokenName]) {
      return [];
    }

    const aliasTokens: { condition: string; name: string }[] = [];
    const aliases = this.tokenSet.colors.alias.aliases[tokenName];

    // Process each condition (root, attention)
    Object.entries(aliases).forEach(([condition, names]) => {
      names.forEach((name) => {
        aliasTokens.push({ condition, name });
      });
    });

    return aliasTokens;
  }

  private addAliasToken(tokenName: string): void {
    if (!this.tokenSet.colors?.alias?.aliases) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));

    // Ensure the semantic token exists in the aliases structure
    if (!updatedTokenSet.colors.alias.aliases[tokenName]) {
      updatedTokenSet.colors.alias.aliases[tokenName] = {};
    }

    // Ensure the 'root' condition exists
    if (!updatedTokenSet.colors.alias.aliases[tokenName].root) {
      updatedTokenSet.colors.alias.aliases[tokenName].root = [];
    }

    // Generate a random ID for the alias name
    const aliasName = makeId('alias--');

    // Add the new alias to the 'root' condition
    updatedTokenSet.colors.alias.aliases[tokenName].root.push(aliasName);

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private removeAliasToken(tokenName: string, condition: string, aliasName: string): void {
    if (!this.tokenSet.colors?.alias?.aliases?.[tokenName]?.[condition]) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));

    // Find the index of the alias in the array
    const aliasIndex = updatedTokenSet.colors.alias.aliases[tokenName][condition].indexOf(aliasName);
    if (aliasIndex === -1) {
      return;
    }

    // Remove the alias from the array
    updatedTokenSet.colors.alias.aliases[tokenName][condition].splice(aliasIndex, 1);

    // If the condition array is empty, remove it
    if (updatedTokenSet.colors.alias.aliases[tokenName][condition].length === 0) {
      delete updatedTokenSet.colors.alias.aliases[tokenName][condition];
    }

    // If the token has no more conditions, remove it from aliases
    if (Object.keys(updatedTokenSet.colors.alias.aliases[tokenName]).length === 0) {
      delete updatedTokenSet.colors.alias.aliases[tokenName];
    }

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private updateAliasToken(
    tokenName: string,
    oldCondition: string,
    oldName: string,
    newCondition: string,
    newName: string,
  ): void {
    if (!this.tokenSet.colors?.alias?.aliases?.[tokenName]?.[oldCondition]) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));

    // Find the index of the old alias in the array
    const aliasIndex = updatedTokenSet.colors.alias.aliases[tokenName][oldCondition].indexOf(oldName);
    if (aliasIndex === -1) {
      return;
    }

    // Remove the old alias
    updatedTokenSet.colors.alias.aliases[tokenName][oldCondition].splice(aliasIndex, 1);

    // If the old condition array is empty, remove it
    if (updatedTokenSet.colors.alias.aliases[tokenName][oldCondition].length === 0) {
      delete updatedTokenSet.colors.alias.aliases[tokenName][oldCondition];
    }

    // Ensure the new condition exists
    if (!updatedTokenSet.colors.alias.aliases[tokenName][newCondition]) {
      updatedTokenSet.colors.alias.aliases[tokenName][newCondition] = [];
    }

    // Add the new alias to the new condition
    updatedTokenSet.colors.alias.aliases[tokenName][newCondition].push(newName);

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private checkDuplicateAlias(tokenName: string, condition: string, aliasName: string): boolean {
    if (!this.tokenSet.colors?.alias?.aliases) {
      return false;
    }

    // Check if the alias exists in any other token with the same condition
    for (const [currentTokenName, conditions] of Object.entries(this.tokenSet.colors.alias.aliases)) {
      // Skip the current token
      if (currentTokenName === tokenName) {
        continue;
      }

      // Check if the condition exists and contains the alias name
      if (conditions[condition] && conditions[condition].includes(aliasName)) {
        return true;
      }
    }

    return false;
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
    const contentId = `${tokenName}-content`;
    const aliasListId = `${tokenName}-alias-list`;

    // Toggle expanded/collapsed state
    const toggleExpanded = (e: Event) => {
      const button = e.currentTarget as HTMLButtonElement;
      const container = button.closest('.collapsible-token') as HTMLElement;
      const isExpanded = container.getAttribute('data-state') === 'expanded';
      container.setAttribute('data-state', isExpanded ? 'collapsed' : 'expanded');
      button.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
    };

    return html`
      <div role="group" class="collapsible-token" data-state="collapsed">
        <h3 id="${tokenHeadingId}" class="token-title">
          <button
            class="toggle-button dx-focus-ring dx-button"
            @click=${toggleExpanded}
            aria-expanded="false"
            aria-controls="${contentId}"
          >
            <dx-icon icon="ph--caret-down--regular"></dx-icon>
            <span class="sr-only">Toggle token controls</span>
          </button>
          <span class="static-token-name" @click=${toggleExpanded}>${tokenName}</span>
          <input
            type="text"
            class="token-name-input dx-focus-ring"
            .value=${tokenName}
            @change=${(e: Event) => this.handleTokenNameChange(tokenName, (e.target as HTMLInputElement).value)}
            aria-label="Token name"
          />
          <button
            class="remove-token-button dx-focus-ring dx-button"
            @click=${() => this.removeSemanticToken(tokenName)}
            aria-label="Remove token"
          >
            <span class="sr-only">Remove token</span>
            <dx-icon icon="ph--minus--regular" />
          </button>
        </h3>
        <div id="${contentId}" class="token-config-content">
          <div class="token-header">
            <div class="token-series-select">
              <label class="control-label" for="${seriesSelectId}">Palette:</label>
              <select
                id="${seriesSelectId}"
                class="series-select dx-focus-ring"
                .value=${currentSeries}
                @change=${(e: Event) => this.handleBothSeriesChange(tokenName, (e.target as HTMLSelectElement).value)}
                aria-labelledby="${tokenHeadingId}"
              >
                ${repeat(
                  physicalColorSeries,
                  (series) => series,
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
          <div role="group" class="control-group">
            <div role="none" class="control-group-item">
              <div class="shade-preview dark">
                <div class="shade" style="${styleMap({ backgroundColor: `var(--dx-${tokenName})` })}"></div>
              </div>
              <dx-range-spinbutton
                label="Dark"
                min="0"
                max="1000"
                step="1"
                .value=${darkLuminosity}
                headingId=${darkHeadingId}
                @value-changed=${(e: CustomEvent) => this.handleLuminosityChange(tokenName, 'dark', e.detail.value)}
                variant="reverse-range"
              ></dx-range-spinbutton>
            </div>
            <div role="none" class="control-group-item">
              <div class="shade-preview">
                <div class="shade" style="${styleMap({ backgroundColor: `var(--dx-${tokenName})` })}"></div>
              </div>
              <dx-range-spinbutton
                label="Light"
                min="0"
                max="1000"
                step="1"
                .value=${lightLuminosity}
                headingId=${lightHeadingId}
                @value-changed=${(e: CustomEvent) => this.handleLuminosityChange(tokenName, 'light', e.detail.value)}
                variant="reverse-order"
              ></dx-range-spinbutton>
            </div>
          </div>

          <!-- Alias tokens -->
          <div class="semantic-alias-token-section">
            <ul id="${aliasListId}" class="semantic-alias-token-list">
              ${repeat(
                this.getAliasTokensForSemantic(tokenName),
                (alias) => `${tokenName}-${alias.condition}-${alias.name}`,
                (alias) => html`
                  <li class="alias-token-item">
                    <div role="none" class="condition-and-validation">
                      <p
                        class="alias-validation"
                        style=${styleMap({
                          display: this.checkDuplicateAlias(tokenName, alias.condition, alias.name) ? 'flex' : 'none',
                        })}
                      >
                        <dx-icon icon="ph--warning--duotone" size="6"></dx-icon>Duplicate
                      </p>
                      <select
                        class="alias-condition-select dx-focus-ring"
                        .value=${alias.condition}
                        @change=${(e: Event) => {
                          const newCondition = (e.target as HTMLSelectElement).value;
                          this.updateAliasToken(tokenName, alias.condition, alias.name, newCondition, alias.name);
                        }}
                      >
                        <option value="root">root</option>
                        <option value="attention">attention</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      class="alias-name-input dx-focus-ring"
                      .value=${alias.name}
                      @change=${(e: Event) => {
                        const newName = (e.target as HTMLInputElement).value;
                        this.updateAliasToken(tokenName, alias.condition, alias.name, alias.condition, newName);
                      }}
                    />
                    <button
                      class="remove-alias-button dx-focus-ring dx-button"
                      @click=${() => this.removeAliasToken(tokenName, alias.condition, alias.name)}
                    >
                      <span class="sr-only">Remove alias token</span>
                      <dx-icon icon="ph--minus--regular" />
                    </button>
                  </li>
                `,
              )}
            </ul>
            <button class="add-alias-button dx-focus-ring dx-button" @click=${() => this.addAliasToken(tokenName)}>
              Add alias
            </button>
          </div>
        </div>
      </div>
    `;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    saveAndRender(this.tokenSet);
    window.addEventListener(tokenSetUpdateEvent, this.handleTokenSetUpdate);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(tokenSetUpdateEvent, this.handleTokenSetUpdate);
  }

  private handleSearchChange(e: Event): void {
    this.searchTerm = (e.target as HTMLInputElement).value;
  }

  override render() {
    const semanticTokens = this.getSemanticTokens();
    const filteredTokens = semanticTokens.filter(([tokenName]) =>
      tokenName.toLowerCase().includes(this.searchTerm.toLowerCase()),
    );

    return html`
      <input
        type="search"
        class="token-search dx-focus-ring"
        placeholder="Search semantic tokens…"
        .value=${this.searchTerm}
        @input=${this.handleSearchChange}
        aria-label="Search tokens"
      />
      ${repeat(
        filteredTokens,
        ([tokenName]) => tokenName,
        ([tokenName, tokenValue]) => this.renderTokenControls(tokenName, tokenValue),
      )}
      <button class="add-token-button dx-focus-ring dx-button" @click=${this.addSemanticToken}>Add token</button>
    `;
  }

  override createRenderRoot(): this {
    return this;
  }
}
