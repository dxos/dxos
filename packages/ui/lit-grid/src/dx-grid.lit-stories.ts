//
// Copyright 2024 DXOS.org
//

import './dx-grid.ts';
import './dx-grid.pcss';

import { html } from 'lit';

export default {
  title: 'ch-grid',
};

export const Basic = ({ values }: { values: string }) => html`<dx-grid values="${values}"></dx-grid>`;

Basic.args = {
  values: JSON.stringify({
    ':g1': {
      pos: '1,1',
      end: '8,1',
      value: 'Weekly sales report',
    },
  }),
};
