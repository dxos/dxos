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

  @property({ type: Boolean })
  expanded: boolean = false;

  @property({ type: String })
  controls: string = '';

  @property({ type: String })
  placeholder: string = '';

  override render() {
    return html`<button
      role="combobox"
      aria-expanded=${this.expanded}
      ?aria-controls=${this.controls}
      aria-haspopup="dialog"
      class="dx-grid__cell__multiselect"
      data-dx-grid-accessory="invoke-multiselect"
      data-dx-grid-action="accessory"
    >
      ${this.values.length > 0
        ? this.values.map(({ label }) => html`<span class="dx-grid__cell__multiselect__value">${label}</span>`)
        : html`<span class="dx-grid__cell__multiselect__placeholder">${this.placeholder}</span>`}
      <span role="none" class="dx-grid__cell__multiselect__separator"></span>
      <svg><use href="/icons.svg#ph--caret-down--regular" /></svg>
    </button>`;
  }

  override createRenderRoot(): this {
    return this;
  }
}
