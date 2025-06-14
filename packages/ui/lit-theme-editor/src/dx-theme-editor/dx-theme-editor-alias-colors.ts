//
// Copyright 2025 DXOS.org
//

import { type TokenSet, type AliasLayer } from '@ch-ui/tokens';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { debounce } from '@dxos/async';
import { makeId } from '@dxos/react-hooks';

import { restore, saveAndRender, tokenSetUpdateEvent } from './util';

export type DxThemeEditorAliasColorsProps = {};

@customElement('dx-theme-editor-alias-colors')
export class DxThemeEditorAliasColors extends LitElement {
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

  private getSemanticTokenNames(): string[] {
    if (!this.tokenSet.colors?.semantic?.sememes) {
      return [];
    }

    return Object.keys(this.tokenSet.colors.semantic.sememes);
  }

  private getUniqueAliasTokens(): { name: string; root?: string; attention?: string }[] {
    if (!this.tokenSet.colors?.alias?.aliases) {
      return [];
    }

    const aliasMap = new Map<string, { name: string; root?: string; attention?: string }>();

    // Process all semantic tokens
    Object.entries(this.tokenSet.colors.alias.aliases).forEach(([semanticToken, conditions]) => {
      // Process each condition (root, attention)
      Object.entries(conditions).forEach(([condition, aliasNames]) => {
        // Process each alias name
        aliasNames.forEach((aliasName) => {
          // If the alias is not in the map yet, add it
          if (!aliasMap.has(aliasName)) {
            aliasMap.set(aliasName, { name: aliasName });
          }

          // Update the condition mapping
          const aliasInfo = aliasMap.get(aliasName)!;
          if (condition === 'root') {
            aliasInfo.root = semanticToken;
          } else if (condition === 'attention') {
            aliasInfo.attention = semanticToken;
          }
        });
      });
    });

    return Array.from(aliasMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private updateAliasToken(oldName: string, newName: string, rootToken?: string, attentionToken?: string): void {
    if (!this.tokenSet.colors?.alias?.aliases) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));
    const aliases = updatedTokenSet.colors.alias.aliases as AliasLayer['aliases'];

    // Remove the old alias from all semantic tokens
    Object.entries(aliases).forEach(([semanticToken, conditions]) => {
      Object.entries(conditions).forEach(([condition, aliasNames]) => {
        const index = aliasNames.indexOf(oldName);
        if (index !== -1) {
          aliasNames.splice(index, 1);
          if (aliasNames.length === 0) {
            delete conditions[condition];
          }
          if (Object.keys(conditions).length === 0) {
            delete aliases[semanticToken];
          }
        }
      });
    });

    // Add the new alias to the specified semantic tokens
    if (rootToken) {
      if (!aliases[rootToken]) {
        aliases[rootToken] = {};
      }
      if (!aliases[rootToken].root) {
        aliases[rootToken].root = [];
      }
      aliases[rootToken].root.push(newName);
    }

    if (attentionToken) {
      if (!aliases[attentionToken]) {
        aliases[attentionToken] = {};
      }
      if (!aliases[attentionToken].attention) {
        aliases[attentionToken].attention = [];
      }
      aliases[attentionToken].attention.push(newName);
    }

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private removeAliasToken(aliasName: string): void {
    if (!this.tokenSet.colors?.alias?.aliases) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));
    const aliases = updatedTokenSet.colors.alias.aliases as AliasLayer['aliases'];

    // Remove the alias from all semantic tokens
    Object.entries(aliases).forEach(([semanticToken, conditions]) => {
      Object.entries(conditions).forEach(([condition, aliasNames]) => {
        const index = aliasNames.indexOf(aliasName);
        if (index !== -1) {
          aliasNames.splice(index, 1);
          if (aliasNames.length === 0) {
            delete conditions[condition];
          }
          if (Object.keys(conditions).length === 0) {
            delete aliases[semanticToken];
          }
        }
      });
    });

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private addAliasToken(): void {
    if (!this.tokenSet.colors?.semantic?.sememes || !this.tokenSet.colors?.alias?.aliases) {
      return;
    }

    // Get the first semantic token
    const semanticTokens = Object.keys(this.tokenSet.colors.semantic.sememes);
    if (semanticTokens.length === 0) {
      return;
    }

    const firstSemanticToken = semanticTokens[0];

    // Generate a random ID for the alias name
    const aliasName = makeId('alias--');

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));
    const aliases = updatedTokenSet.colors.alias.aliases;

    // Ensure the semantic token exists in the aliases structure
    if (!aliases[firstSemanticToken]) {
      aliases[firstSemanticToken] = {};
    }

    // Ensure the 'root' condition exists
    if (!aliases[firstSemanticToken].root) {
      aliases[firstSemanticToken].root = [];
    }

    // Add the new alias to the 'root' condition
    aliases[firstSemanticToken].root.push(aliasName);

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private handleSearchChange(e: Event): void {
    this.searchTerm = (e.target as HTMLInputElement).value;
  }

  private renderSemanticTokenSelect(
    condition: 'root' | 'attention',
    currentValue: string | undefined,
    onChange: (value: string) => void,
  ) {
    const semanticTokenNames = this.getSemanticTokenNames();

    return html`
      <label class="sr-only">${condition === 'root' ? 'Root' : 'Attention'}:</label>
      <select
        class="semantic-token-select dx-focus-ring"
        .value=${currentValue || ''}
        @change=${(e: Event) => {
          const newValue = (e.target as HTMLSelectElement).value;
          onChange(newValue);
        }}
      >
        <option value="">&mdash;</option>
        ${repeat(
          semanticTokenNames,
          (name) => name,
          (name) => html`<option value="${name}" ?selected=${name === currentValue}>${name}</option>`,
        )}
      </select>
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

  override render() {
    const aliasTokens = this.getUniqueAliasTokens();
    const filteredTokens = aliasTokens.filter((token) =>
      token.name.toLowerCase().includes(this.searchTerm.toLowerCase()),
    );

    return html`
      <input
        type="search"
        class="token-search dx-focus-ring"
        placeholder="Search alias tokens…"
        .value=${this.searchTerm}
        @input=${this.handleSearchChange}
        aria-label="Search tokens"
      />
      <div class="alias-token-list">
        <div class="alias-token-labels">
          <span>Name</span>
          <span>Root</span>
          <span>Attention</span>
        </div>
        ${repeat(
          filteredTokens,
          (token) => token.name,
          (token) => html`
            <div class="alias-token-item">
              <input
                type="text"
                class="alias-name-input dx-focus-ring"
                .value=${token.name}
                @change=${(e: Event) => {
                  const newName = (e.target as HTMLInputElement).value;
                  this.updateAliasToken(token.name, newName, token.root, token.attention);
                }}
                aria-label="Alias token name"
              />
              <div class="condition-selector">
                ${this.renderSemanticTokenSelect('root', token.root, (newValue) => {
                  this.updateAliasToken(token.name, token.name, newValue, token.attention);
                })}
              </div>
              <div class="condition-selector">
                ${this.renderSemanticTokenSelect('attention', token.attention, (newValue) => {
                  this.updateAliasToken(token.name, token.name, token.root, newValue);
                })}
              </div>
              <button
                class="remove-alias-button dx-focus-ring dx-button"
                @click=${() => this.removeAliasToken(token.name)}
                aria-label="Remove alias token"
              >
                <span class="sr-only">Remove alias token</span>
                <dx-icon icon="ph--minus--regular" />
              </button>
            </div>
          `,
        )}
      </div>
      <button class="add-alias-button dx-focus-ring dx-button" @click=${this.addAliasToken}>Add alias</button>
    `;
  }

  override createRenderRoot(): this {
    return this;
  }
}
