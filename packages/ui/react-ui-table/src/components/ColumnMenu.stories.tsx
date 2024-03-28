//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { type SortDirection } from '@tanstack/react-table';
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
          toggleSorting: (desc?: boolean) => {
            console.log('toggleSorting', { desc });
          },
          getToggleSortingHandler: () => () => {
            console.log('Sorting handler invoked');
          },
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

export const ReactiveSort = {
  render: () => {
    const [sort, setSort] = React.useState<SortDirection | false>(false);
    const props = {
      column: {
        id: 'test',
        label: 'test',
      } as ColumnProps,
      context: {
        header: {
          column: {
            getCanSort: () => true,
            toggleSorting: (desc?: boolean) => {
              if (desc === undefined) {
                setSort(false);
              } else if (desc) {
                setSort('desc');
              } else {
                setSort('asc');
              }
            },
            getIsSorted: () => sort,
            clearSorting: () => setSort(false),
            getToggleSortingHandler: () => () => {
              if (sort === 'asc') {
                setSort('desc');
              } else {
                setSort(false);
              }
            },
          },
        },
      },
    } as any;

    return (
      <div className='flex justify-around w-full overflow-hidden'>
        <div className='grid w-48'>
          <ColumnMenu {...props} />
        </div>
      </div>
    );
  },
};
