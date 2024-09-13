//
// Copyright 2024 DXOS.org
//

import './dx-grid.ts';
import './dx-grid.pcss';

import { html, nothing } from 'lit';

import { type DxGridProps } from './dx-grid';

export default {
  title: 'dx-grid',
};

export const Basic = (props: DxGridProps) => {
  return html`<dx-grid cells=${props.cells ?? nothing} columnDefault=${props.columnDefault ?? nothing}></dx-grid>`;
};

Basic.args = {
  cells: JSON.stringify({
    '1,1': {
      // end: '8,1',
      value: 'Weekly sales report',
    },
  }),
  columnDefault: JSON.stringify({
    size: 180,
    resizeable: true,
    labelFallback: 'a1',
  }),
};
