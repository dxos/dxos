//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { ColumnPanel } from './ColumnMenu';
import { TableSchemaProp } from './schema';

export default {
  component: ColumnPanel,
};

export const Default = {
  args: {
    column: {
      id: 'test',
      label: 'test',
    } as TableSchemaProp,
  },
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <div className='flex w-[250px] m-8 bg-white'>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};
