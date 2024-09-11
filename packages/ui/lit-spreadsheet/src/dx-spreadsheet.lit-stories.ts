//
// Copyright 2024 DXOS.org
//

import './dx-spreadsheet.ts';
import './dx-spreadsheet.pcss';

import { html } from 'lit';

export default {
  title: 'ch-spreadsheet',
};

export const Basic = ({ values }: { values: string }) => html`<dx-spreadsheet values="${values}"></dx-spreadsheet>`;

Basic.args = {
  values: JSON.stringify({
    ':g1': {
      pos: '1,1',
      end: '8,1',
      value: 'Weekly sales report',
    },
  }),
};
