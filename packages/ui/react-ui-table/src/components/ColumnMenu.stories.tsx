//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { ColumnPanel } from './ColumnMenu';
import { type ColumnProps } from '../schema';

export default {
  title: 'react-ui-table/ColumnPanel',
  component: ColumnPanel,
  decorators: [withTheme],
};

export const Default = {
  args: {
    column: {
      id: 'test',
      label: 'test',
    } as ColumnProps,
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
