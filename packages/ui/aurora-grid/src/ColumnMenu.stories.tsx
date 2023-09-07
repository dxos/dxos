//
// Copyright 2023 DXOS.org
//

import React from 'react';

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
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <div className='flex w-full w-[250px] bg-white'>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};
