//
// Copyright 2023 DXOS.org
//

import { ColumnPanel } from './ColumnMenu';
import { GridSchemaProp } from './schema';

export default {
  component: ColumnPanel,
};

export const Default = {
  args: {
    column: {
      id: 'test',
      label: 'test',
    } as GridSchemaProp,
  },
};
