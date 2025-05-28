//
// Copyright 2025 DXOS.org
//

import { type ResolvedHelicalArcSeries, type TokenSet } from '@ch-ui/tokens';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { debounce } from '@dxos/async';

import { restore, saveAndRender } from './util';
import './dx-theme-editor.pcss';

export type DxThemeEditorProps = {};

const bindSeriesDefinitions = ['neutral', 'primary'];

const isHelicalArcSeries = (o: any): o is ResolvedHelicalArcSeries => {
  return 'keyPoint' in (o ?? {});
};

@customElement('dx-theme-editor')
export class DxThemeEditor extends LitElement {
  @state()
  tokenSet: TokenSet = restore();

  private debouncedSaveAndRender = debounce(() => {
    saveAndRender(JSON.stringify(this.tokenSet));
  }, 200);

  private updateSeriesProperty(series: string, property: string, value: any) {
    if (!this.tokenSet.colors?.physical?.definitions?.series?.[series]) {
      return;
    }

    // Create a deep copy of the tokenSet to avoid direct mutation
    const updatedTokenSet = JSON.parse(JSON.stringify(this.tokenSet));

    // Update the specific property
    updatedTokenSet.colors.physical.definitions.series[series][property] = value;

    // Update the state
    this.tokenSet = updatedTokenSet;

    // Save and render changes
    this.debouncedSaveAndRender();
  }

  private handleKeyPointChange(series: string, index: number, value: number) {
    if (!isHelicalArcSeries(this.tokenSet.colors?.physical?.definitions?.series?.[series])) {
      return;
    }

    const keyPoint = [...this.tokenSet.colors.physical.definitions.series[series].keyPoint];
    keyPoint[index] = value;

    this.updateSeriesProperty(series, 'keyPoint', keyPoint);
  }

  private handleControlPointChange(series: string, property: 'lowerCp' | 'upperCp', value: number) {
    this.updateSeriesProperty(series, property, value);
  }

  private handleTorsionChange(series: string, value: number) {
    this.updateSeriesProperty(series, 'torsion', value);
  }

  private renderSeriesControls(series: string) {
    const seriesData = this.tokenSet.colors?.physical?.definitions?.series?.[series];
    if (!isHelicalArcSeries(seriesData)) {
      return html`<div>Series ${series} not found</div>`;
    }

    const keyPoint = seriesData.keyPoint || [0, 0, 0];
    const lowerCp = seriesData.lowerCp || 0;
    const upperCp = seriesData.upperCp || 0;
    const torsion = seriesData.torsion || 0;

    // Create a color preview based on the keyPoint
    const previewColor = `oklch(${keyPoint[0]} ${keyPoint[1]} ${keyPoint[2]})`;

    return html`
      <div class="series-controls">
        <div class="series-header">
          <h3 class="series-title">${series} Series</h3>
          <div
            class="color-preview"
            style=${styleMap({ backgroundColor: previewColor })}
          ></div>
        </div>

        <div class="control-group">
          <h4 class="control-group-title">Key Color</h4>

          <div class="control-row">
            <label class="control-label">Lightness (0-1):</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="range-input"
              .value=${keyPoint[0].toString()}
              @input=${(e: Event) =>
                this.handleKeyPointChange(series, 0, parseFloat((e.target as HTMLInputElement).value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              class="number-input"
              .value=${keyPoint[0].toString()}
              @input=${(e: Event) =>
                this.handleKeyPointChange(series, 0, parseFloat((e.target as HTMLInputElement).value))}
            />
          </div>

          <div class="control-row">
            <label class="control-label">Chroma (0-0.3):</label>
            <input
              type="range"
              min="0"
              max="0.3"
              step="0.01"
              class="range-input"
              .value=${keyPoint[1].toString()}
              @input=${(e: Event) =>
                this.handleKeyPointChange(series, 1, parseFloat((e.target as HTMLInputElement).value))}
            />
            <input
              type="number"
              min="0"
              max="0.3"
              step="0.01"
              class="number-input"
              .value=${keyPoint[1].toString()}
              @input=${(e: Event) =>
                this.handleKeyPointChange(series, 1, parseFloat((e.target as HTMLInputElement).value))}
            />
          </div>

          <div class="control-row">
            <label class="control-label">Hue (0-360):</label>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              class="range-input"
              .value=${keyPoint[2].toString()}
              @input=${(e: Event) =>
                this.handleKeyPointChange(series, 2, parseFloat((e.target as HTMLInputElement).value))}
            />
            <input
              type="number"
              min="0"
              max="360"
              step="1"
              class="number-input"
              .value=${keyPoint[2].toString()}
              @input=${(e: Event) =>
                this.handleKeyPointChange(series, 2, parseFloat((e.target as HTMLInputElement).value))}
            />
          </div>
        </div>

        <div class="control-group">
          <h4 class="control-group-title">Control Points</h4>

          <div class="control-row">
            <label class="control-label">Light Control Point (0-1):</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="range-input"
              .value=${lowerCp.toString()}
              @input=${(e: Event) =>
                this.handleControlPointChange(series, 'lowerCp', parseFloat((e.target as HTMLInputElement).value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              class="number-input"
              .value=${lowerCp.toString()}
              @input=${(e: Event) =>
                this.handleControlPointChange(series, 'lowerCp', parseFloat((e.target as HTMLInputElement).value))}
            />
          </div>

          <div class="control-row">
            <label class="control-label">Dark Control Point (0-1):</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="range-input"
              .value=${upperCp.toString()}
              @input=${(e: Event) =>
                this.handleControlPointChange(series, 'upperCp', parseFloat((e.target as HTMLInputElement).value))}
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              class="number-input"
              .value=${upperCp.toString()}
              @input=${(e: Event) =>
                this.handleControlPointChange(series, 'upperCp', parseFloat((e.target as HTMLInputElement).value))}
            />
          </div>
        </div>

        <div class="control-group">
          <h4 class="control-group-title">Torsion</h4>

          <div class="control-row">
            <label class="control-label">Torsion (-180 to 180):</label>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              class="range-input"
              .value=${torsion.toString()}
              @input=${(e: Event) => this.handleTorsionChange(series, parseFloat((e.target as HTMLInputElement).value))}
            />
            <input
              type="number"
              min="-180"
              max="180"
              step="1"
              class="number-input"
              .value=${torsion.toString()}
              @input=${(e: Event) => this.handleTorsionChange(series, parseFloat((e.target as HTMLInputElement).value))}
            />
          </div>
        </div>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="theme-editor-container">
        <h2>Theme Editor</h2>

        ${bindSeriesDefinitions.map(
          (series) => html`
            <div class="series-container">
              ${this.renderSeriesControls(series)}
            </div>
          `,
        )}
      </div>
    `;
  }

  override createRenderRoot() {
    return this;
  }
}
