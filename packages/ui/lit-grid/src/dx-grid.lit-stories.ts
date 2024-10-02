//
// Copyright 2024 DXOS.org
//

import './dx-grid.ts';
import './dx-grid.pcss';

import { html, nothing } from 'lit';

import { type DxGridProps } from './types';

export default {
  title: 'dx-grid',
  parameters: { layout: 'fullscreen' },
};

export const Basic = (props: DxGridProps) => {
  return html`<div style="position:fixed;inset:0;">
    <dx-grid
      cells=${props.initialCells ?? nothing}
      columnDefault=${props.columnDefault ?? nothing}
      rowDefault=${props.rowDefault ?? nothing}
      columns=${props.columns ?? nothing}
    ></dx-grid>
  </div>`;
};

Basic.args = {
  cells: JSON.stringify({
    '1,1': {
      // end: '8,1',
      value: 'Weekly sales report',
    },
  } satisfies DxGridProps['initialCells']),
  columnDefault: JSON.stringify({
    size: 180,
    resizeable: true,
  } satisfies DxGridProps['columnDefault']),
  rowDefault: JSON.stringify({
    size: 32,
    resizeable: true,
  } satisfies DxGridProps['rowDefault']),
  columns: JSON.stringify({
    0: { size: 200 },
    1: { size: 210 },
    2: { size: 230 },
    3: { size: 250 },
    4: { size: 270 },
  } satisfies DxGridProps['columns']),
};
