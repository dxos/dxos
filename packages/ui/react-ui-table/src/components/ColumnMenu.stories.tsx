//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { ColumnMenu } from './ColumnMenu';
import { type ColumnProps } from '../schema';

export default {
  title: 'react-ui-table/ColumnMenu',
  component: ColumnMenu,
  decorators: [withTheme],
};

export const Default = {
  args: {
    column: {
      id: 'test',
      label: 'test',
    } as ColumnProps,
    context: {
      header: {
        column: {
          getCanSort: () => true,
          getToggleSortingHandler: () => () => console.log('toggleSort'),
          getIsSorted: () => false,
        },
      },
    },
  },
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};
