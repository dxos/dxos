//
// Copyright 2024 DXOS.org
//

import './ch-spreadsheet.ts';
import './ch-spreadsheet.pcss';

import { html } from 'lit';

export default {
  title: 'ch-spreadsheet',
};

export const Basic = ({ values }: { values: string }) => html`<ch-spreadsheet values="${values}"></ch-spreadsheet>`;

Basic.args = {
  values: JSON.stringify({
    ':g1': {
      pos: '1,1',
      end: '8,1',
      value: 'Weekly sales report',
    },
  }),
};
