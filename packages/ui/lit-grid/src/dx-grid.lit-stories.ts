//
// Copyright 2024 DXOS.org
//

import './dx-grid.ts';
import './dx-grid.pcss';

import './dx-grid-multiselect-cell.ts';

import { html, nothing } from 'lit';

import { type DxGridFrozenPlane, type DxGridPlaneCells, type DxGridProps } from './types';
import { colToA1Notation, rowToA1Notation } from './util';

export default {
  title: 'dx-grid',
  parameters: { layout: 'fullscreen' },
};

export const Basic = (props: DxGridProps) => {
  return html`<div class="dark" style="position:fixed;inset:0;">
    <dx-grid
      initialCells=${props.initialCells ?? nothing}
      columnDefault=${props.columnDefault ?? nothing}
      rowDefault=${props.rowDefault ?? nothing}
      columns=${props.columns ?? nothing}
      frozen=${props.frozen ?? nothing}
    ></dx-grid>
  </div>`;
};

const initialLabels = {
  fixedStartStart: {
    '0,0': { value: '', resizeHandle: 'col' },
  },
  frozenColsStart: [...Array(64)].reduce((acc, _, i) => {
    acc[`0,${i}`] = { value: rowToA1Notation(i), className: 'text-end !pie-1', resizeHandle: 'row' };
    return acc;
  }, {}),
  frozenRowsStart: [...Array(12)].reduce((acc, _, i) => {
    acc[`${i},0`] = { value: colToA1Notation(i), resizeHandle: 'col' };
    return acc;
  }, {}),
} satisfies Partial<Record<DxGridFrozenPlane | 'fixedStartStart', DxGridPlaneCells>>;

Basic.args = {
  initialCells: JSON.stringify({
    grid: {
      '1,1': {
        // end: '8,1',
        value: 'Waffle production',
      },
      '2,2': {
        value: '',
        accessoryHtml: '<dx-grid-multiselect-cell values=\'[{"label": "Peaches"}]\'></dx-grid-multiselect-cell>',
      },
    },
    ...initialLabels,
  } satisfies DxGridProps['initialCells']),
  columnDefault: JSON.stringify({
    grid: {
      size: 180,
      resizeable: true,
    },
    frozenColsStart: {
      size: 64,
      resizeable: true,
    },
  } satisfies DxGridProps['columnDefault']),
  rowDefault: JSON.stringify({
    grid: {
      size: 32,
      resizeable: true,
    },
    frozenRowsStart: {
      size: 32,
      resizeable: true,
    },
  } satisfies DxGridProps['rowDefault']),
  columns: JSON.stringify({
    grid: {
      0: { size: 64 },
      1: { size: 512 },
      2: { size: 64 },
      3: { size: 512 },
      4: { size: 64 },
      5: { size: 512 },
      6: { size: 64 },
      7: { size: 512 },
      8: { size: 64 },
      9: { size: 512 },
    },
  } satisfies DxGridProps['columns']),
  frozen: JSON.stringify({
    frozenColsStart: 1,
    frozenRowsStart: 1,
  } satisfies DxGridProps['frozen']),
};

export const Frozen = (props: DxGridProps) => {
  return html`<div class="dark" style="position:fixed;inset:0;">
    <dx-grid
      initialCells=${props.initialCells ?? nothing}
      columnDefault=${props.columnDefault ?? nothing}
      rowDefault=${props.rowDefault ?? nothing}
      columns=${props.columns ?? nothing}
      frozen=${props.frozen ?? nothing}
    ></dx-grid>
  </div>`;
};

Frozen.args = {
  initialCells: JSON.stringify({
    grid: {},
    ...initialLabels,
  } satisfies DxGridProps['initialCells']),
  columnDefault: JSON.stringify({
    grid: {
      size: 32,
    },
    frozenColsStart: {
      size: 32,
    },
    frozenColsEnd: {
      size: 32,
    },
  } satisfies DxGridProps['columnDefault']),
  rowDefault: JSON.stringify({
    grid: {
      size: 32,
    },
    frozenRowsStart: {
      size: 32,
    },
    frozenRowsEnd: {
      size: 32,
    },
  } satisfies DxGridProps['rowDefault']),
  columns: JSON.stringify({ grid: {} } satisfies DxGridProps['columns']),
  rows: JSON.stringify({ grid: {} } satisfies DxGridProps['rows']),
  frozen: JSON.stringify({
    frozenColsStart: 2,
    frozenRowsStart: 2,
    frozenColsEnd: 2,
    frozenRowsEnd: 2,
  } satisfies DxGridProps['frozen']),
};

export const Limits = (props: DxGridProps) => {
  return html`<div style="position:fixed;inset:0;">
    <dx-grid
      limitRows=${props.limitRows ?? nothing}
      limitColumns=${props.limitColumns ?? nothing}
      columnDefault=${props.columnDefault ?? nothing}
      rowDefault=${props.rowDefault ?? nothing}
      columns=${props.columns ?? nothing}
    ></dx-grid>
  </div>`;
};

Limits.args = {
  limitRows: JSON.stringify(10 satisfies DxGridProps['limitRows']),
  limitColumns: JSON.stringify(3 satisfies DxGridProps['limitColumns']),
  columnDefault: JSON.stringify({
    grid: {
      size: 180,
      resizeable: true,
    },
  } satisfies DxGridProps['columnDefault']),
  rowDefault: JSON.stringify({
    grid: {
      size: 32,
      resizeable: true,
    },
  } satisfies DxGridProps['rowDefault']),
  columns: JSON.stringify({
    grid: {
      0: { size: 200 },
      1: { size: 210 },
      2: { size: 230 },
      3: { size: 250 },
      4: { size: 270 },
    },
  } satisfies DxGridProps['columns']),
};
