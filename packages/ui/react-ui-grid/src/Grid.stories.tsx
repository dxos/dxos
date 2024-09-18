//
// Copyright 2024 DXOS.org
//

import { withTheme } from '@dxos/storybook-utils';

import { Grid, type GridProps } from './Grid';

export default {
  title: 'react-ui-grid/Grid',
  component: Grid,
  decorators: [withTheme],
};

export const Basic = {
  args: {
    cells: {
      '1,1': {
        // end: '8,1',
        value: 'Weekly sales report',
      },
    },
    columnDefault: {
      size: 180,
      resizeable: true,
    },
    rowDefault: {
      size: 32,
      resizeable: true,
    },
    columns: {
      0: { size: 200 },
      1: { size: 210 },
      2: { size: 230 },
      3: { size: 250 },
      4: { size: 270 },
    },
    onAxisResize: (event) => {
      console.log('[axis resize]', event);
    },
    onEdit: (event) => {
      console.log('[edit]', event);
    },
  } satisfies GridProps,
};
