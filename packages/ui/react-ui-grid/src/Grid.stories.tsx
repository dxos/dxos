//
// Copyright 2024 DXOS.org
//

import type { DxGridProps } from '@dxos/lit-grid';
import { withTheme } from '@dxos/storybook-utils';

import { Grid } from './Grid';

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
    } satisfies DxGridProps['cells'],
    columnDefault: {
      size: 180,
      resizeable: true,
    } satisfies DxGridProps['columnDefault'],
    rowDefault: {
      size: 32,
      resizeable: true,
    } satisfies DxGridProps['rowDefault'],
    columns: {
      0: { size: 200 },
      1: { size: 210 },
      2: { size: 230 },
      3: { size: 250 },
      4: { size: 270 },
    } satisfies DxGridProps['columns'],
  },
};
