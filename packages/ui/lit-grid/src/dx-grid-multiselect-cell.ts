//
// Copyright 2024 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type DxGridSelectValue = {
  label: string;
};

@customElement('dx-grid-multiselect-cell')
export class DxGridMultiselectCell extends LitElement {
  @property({ type: Array })
  values: DxGridSelectValue[] = [];

  override render() {
    return html`<button class="dx-grid__cell__multiselect" data-dx-grid-accessory="invoke-multiselect">
      ${this.values.map(({ label }) => html`<span>${label}</span>`)}
      <span role="none" class="dx-grid__cell__multiselect__separator"></span>
      <svg><use href="/icons.svg#ph--caret-down--regular" /></svg>
    </button>`;
  }

  override createRenderRoot() {
    return this;
  }
}
