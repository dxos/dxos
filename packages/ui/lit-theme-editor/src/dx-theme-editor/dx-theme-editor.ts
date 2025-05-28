//
// Copyright 2025 DXOS.org
//

import { cssGradientFromCurve, helicalArcFromConfig } from '@ch-ui/colors';
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

  private renderControlRow(
    label: string,
    min: string | number,
    max: string | number,
    step: string | number,
    value: string | number,
    onInput: (e: Event) => void,
    headingId: string,
  ) {
    const controlId = `${headingId}-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    return html`
      <div class="control-row">
        <label class="control-label" id="${controlId}-label" for="${controlId}-range">${label}:</label>
        <input
          id="${controlId}-range"
          type="range"
          min="${min}"
          max="${max}"
          step="${step}"
          class="range-input"
          .value=${value.toString()}
          @input=${onInput}
          aria-labelledby="${headingId} ${controlId}-label"
        />
        <input
          id="${controlId}-number"
          type="number"
          min="${min}"
          max="${max}"
          step="${step}"
          class="number-input"
          .value=${value.toString()}
          @input=${onInput}
          aria-labelledby="${headingId} ${controlId}-label"
        />
      </div>
    `;
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

    // Create unique IDs for headings to reference in aria-labelledby
    const keyColorHeadingId = `${series}-key-color-heading`;
    const controlPointsHeadingId = `${series}-control-points-heading`;
    const torsionHeadingId = `${series}-torsion-heading`;

    return html`
      <div class="series-controls">
        <div
          class="series-preview"
          style=${styleMap({
            backgroundImage: cssGradientFromCurve(helicalArcFromConfig(seriesData), 21, [0, 1], 'p3'),
          })}
        ></div>
        <div class="series-header">
          <h3 class="series-title">${series} Series</h3>
        </div>

        <div class="control-group">
          <h4 id="${keyColorHeadingId}" class="control-group-title">Key Color</h4>
          ${this.renderControlRow(
            'Chroma (0-0.5)',
            0,
            0.5,
            0.0025,
            keyPoint[1],
            (e: Event) => this.handleKeyPointChange(series, 1, parseFloat((e.target as HTMLInputElement).value)),
            keyColorHeadingId,
          )}
          ${this.renderControlRow(
            'Hue (0-360)',
            0,
            360,
            0.5,
            keyPoint[2],
            (e: Event) => this.handleKeyPointChange(series, 2, parseFloat((e.target as HTMLInputElement).value)),
            keyColorHeadingId,
          )}
        </div>

        <div class="control-group">
          <h4 id="${controlPointsHeadingId}" class="control-group-title">Control Points</h4>

          ${this.renderControlRow(
            'Dark Control Point (0-1)',
            0,
            1,
            0.01,
            upperCp,
            (e: Event) =>
              this.handleControlPointChange(series, 'upperCp', parseFloat((e.target as HTMLInputElement).value)),
            controlPointsHeadingId,
          )}
          ${this.renderControlRow(
            'Light Control Point (0-1)',
            0,
            1,
            0.01,
            lowerCp,
            (e: Event) =>
              this.handleControlPointChange(series, 'lowerCp', parseFloat((e.target as HTMLInputElement).value)),
            controlPointsHeadingId,
          )}
        </div>

        <div class="control-group">
          <h4 id="${torsionHeadingId}" class="control-group-title">Torsion</h4>

          ${this.renderControlRow(
            'Torsion (-180 to 180)',
            -180,
            180,
            0.5,
            torsion,
            (e: Event) => this.handleTorsionChange(series, parseFloat((e.target as HTMLInputElement).value)),
            torsionHeadingId,
          )}
        </div>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="theme-editor-container">
        <h2>Physical series</h2>
        ${bindSeriesDefinitions.map(
          (series) => html` <div class="series-container">${this.renderSeriesControls(series)}</div> `,
        )}
      </div>
    `;
  }

  override createRenderRoot() {
    return this;
  }
}
