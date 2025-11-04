//
// Copyright 2025 DXOS.org
//

import { cssGradientFromCurve, helicalArcFromConfig } from '@ch-ui/colors';
import { type ResolvedHelicalArcSeries, type TokenSet } from '@ch-ui/tokens';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';

import { debounce } from '@dxos/async';

import { restore, saveAndRender, tokenSetUpdateEvent } from './util';

import './dx-range-spinbutton';

export type DxThemeEditorPhysicalColorsProps = {};

const bindSeriesDefinitions = ['neutral', 'primary'];

const isHelicalArcSeries = (o: any): o is ResolvedHelicalArcSeries => 'keyPoint' in (o ?? {});

@customElement('dx-theme-editor-physical-colors')
export class DxThemeEditorPhysicalColors extends LitElement {
  @state()
  tokenSet: TokenSet = restore();

  private debouncedSaveAndRender = debounce(() => {
    saveAndRender(this.tokenSet);
  }, 200);

  private handleTokenSetUpdate = () => {
    this.tokenSet = restore();
  };

  private updateSeriesProperty(series: string, property: string, value: any): void {
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

  private handleKeyPointChange(series: string, index: number, value: number): void {
    if (!isHelicalArcSeries(this.tokenSet.colors?.physical?.definitions?.series?.[series])) {
      return;
    }

    const keyPoint = [...this.tokenSet.colors.physical.definitions.series[series].keyPoint];
    keyPoint[index] = value;

    this.updateSeriesProperty(series, 'keyPoint', keyPoint);
  }

  private handleControlPointChange(series: string, property: 'lowerCp' | 'upperCp', value: number): void {
    this.updateSeriesProperty(series, property, value);
  }

  private handleTorsionChange(series: string, value: number): void {
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

        <dx-range-spinbutton
          label="Hue (0-360)"
          min="0"
          max="360"
          step="0.5"
          .value=${keyPoint[2]}
          headingId=${keyColorHeadingId}
          @value-changed=${(e: CustomEvent) => this.handleKeyPointChange(series, 2, e.detail.value)}
        ></dx-range-spinbutton>
        <dx-range-spinbutton
          label="Torsion (-180 to 180)"
          min="-180"
          max="180"
          step="0.5"
          .value=${torsion}
          headingId=${torsionHeadingId}
          variant="torsion"
          @value-changed=${(e: CustomEvent) => this.handleTorsionChange(series, e.detail.value)}
        ></dx-range-spinbutton>
        <dx-range-spinbutton
          label="Chroma (0-0.4)"
          min="0"
          max="0.4"
          step="0.001"
          .value=${keyPoint[1]}
          headingId=${keyColorHeadingId}
          @value-changed=${(e: CustomEvent) => this.handleKeyPointChange(series, 1, e.detail.value)}
        ></dx-range-spinbutton>

        <div class="control-group">
          <dx-range-spinbutton
            label="Dark Control Point (0-1)"
            min="0"
            max="1"
            step="0.01"
            .value=${upperCp}
            headingId=${controlPointsHeadingId}
            variant="reverse-range"
            @value-changed=${(e: CustomEvent) => this.handleControlPointChange(series, 'upperCp', e.detail.value)}
          ></dx-range-spinbutton>
          <dx-range-spinbutton
            label="Light Control Point (0-1)"
            min="0"
            max="1"
            step="0.01"
            .value=${lowerCp}
            headingId=${controlPointsHeadingId}
            variant="reverse-order"
            @value-changed=${(e: CustomEvent) => this.handleControlPointChange(series, 'lowerCp', e.detail.value)}
          ></dx-range-spinbutton>
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

  override render() {
    return repeat(
      bindSeriesDefinitions,
      (series) => series,
      (series) => this.renderSeriesControls(series),
    );
  }

  override createRenderRoot(): this {
    return this;
  }
}
