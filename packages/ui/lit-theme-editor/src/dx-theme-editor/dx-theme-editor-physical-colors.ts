//
// Copyright 2025 DXOS.org
//

import { cssGradientFromCurve, helicalArcFromConfig } from '@ch-ui/colors';
import { type ResolvedHelicalArcSeries, type TokenSet } from '@ch-ui/tokens';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import { debounce } from '@dxos/async';

import { restore, saveAndRender } from './util';

import './dx-theme-editor.pcss';

export type DxThemeEditorPhysicalColorsProps = {};

const bindSeriesDefinitions = ['neutral', 'primary'];

const isHelicalArcSeries = (o: any): o is ResolvedHelicalArcSeries => {
  return 'keyPoint' in (o ?? {});
};

@customElement('dx-theme-editor-physical-colors')
export class DxThemeEditorPhysicalColors extends LitElement {
  @state()
  tokenSet: TokenSet = restore();

  private debouncedSaveAndRender = debounce(() => {
    saveAndRender(this.tokenSet);
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
    variant?: 'reverse-range' | 'reverse-order',
  ) {
    const controlId = `${headingId}-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    return html`
      <div class="control-row">
        <label class="control-label" id="${controlId}-label" for="${controlId}-range">${label}:</label>
        <div class="${classMap({ 'control-inputs': true, ...(variant && { [variant]: true }) })}">
          <input
            id="${controlId}-range"
            type="range"
            min="${min}"
            max="${max}"
            step="${step}"
            class="range-input dx-focus-ring"
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
            class="number-input dx-focus-ring"
            .value=${value.toString()}
            @input=${onInput}
            aria-labelledby="${headingId} ${controlId}-label"
          />
        </div>
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
        <h3 class="series-title">${series} Series</h3>

        ${this.renderControlRow(
          'Hue (0-360)',
          0,
          360,
          0.5,
          keyPoint[2],
          (e: Event) => this.handleKeyPointChange(series, 2, parseFloat((e.target as HTMLInputElement).value)),
          keyColorHeadingId,
        )}
        ${this.renderControlRow(
          'Torsion (-180 to 180)',
          -180,
          180,
          0.5,
          torsion,
          (e: Event) => this.handleTorsionChange(series, parseFloat((e.target as HTMLInputElement).value)),
          torsionHeadingId,
        )}
        ${this.renderControlRow(
          'Chroma (0-0.4)',
          0,
          0.4,
          0.0025,
          keyPoint[1],
          (e: Event) => this.handleKeyPointChange(series, 1, parseFloat((e.target as HTMLInputElement).value)),
          keyColorHeadingId,
        )}

        <div class="control-group">
          ${this.renderControlRow(
            'Dark Control Point (0-1)',
            0,
            1,
            0.01,
            upperCp,
            (e: Event) =>
              this.handleControlPointChange(series, 'upperCp', parseFloat((e.target as HTMLInputElement).value)),
            controlPointsHeadingId,
            'reverse-range',
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
            'reverse-order',
          )}
        </div>
      </div>
    `;
  }

  override connectedCallback() {
    super.connectedCallback();
    saveAndRender(this.tokenSet);
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
