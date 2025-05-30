//
// Copyright 2025 DXOS.org
//

import './dx-autocomplete-combobox.ts';
import './dx-autocomplete-combobox.pcss';
import { html } from 'lit';

import { type DxAutocompleteComboboxProps } from './dx-autocomplete-combobox';

export default {
  title: 'dx-autocomplete-combobox',
  parameters: { layout: 'fullscreen' },
};

export const Basic = (props: DxAutocompleteComboboxProps) => {
  return html`<div style="padding:1rem;">
    <dx-autocomplete-combobox
      label="Country"
      options='["Germany", "Japan", "Canada"]'
      autocomplete="both"
    ></dx-autocomplete-combobox>
  </div>`;
};
