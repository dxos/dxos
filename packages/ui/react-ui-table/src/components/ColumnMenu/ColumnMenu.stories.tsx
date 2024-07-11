//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { type SortDirection } from '@tanstack/react-table';
import React, { useState } from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { ColumnMenu } from './ColumnMenu';
import { type ColumnSettingsFormProps } from './ColumnSettingsForm';
import { type ColumnProps } from '../../schema';

export default {
  title: 'react-ui-table/ColumnMenu',
  component: ColumnMenu,
  decorators: [withTheme],
};

const defs: Pick<ColumnSettingsFormProps, 'tableDef' | 'tablesToReference'> = {
  tableDef: {
    id: '1',
    name: 'table 1',
    columns: [{ id: 'col-1', prop: 'one-foo', type: 'string' }],
  },
  tablesToReference: [
    {
      id: '1',
      name: 'table 1',
      columns: [{ id: 'col-1', prop: 'one-foo', type: 'string' }],
    },
    {
      id: '2',
      name: 'table 2',
      columns: [{ id: 'col-1', prop: 'two-foo', type: 'string' }],
    },
  ],
};

const funcs: Pick<ColumnSettingsFormProps, 'onUpdate' | 'onDelete'> = {
  onUpdate: (...args: any) => console.log('onUpdate args', args),
  onDelete: (...args: any) => console.log('onDelete args', args),
};

export const Default = {
  args: {
    column: {
      id: 'test',
      label: 'test',
    } as ColumnProps,

    ...defs,
    ...funcs,

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
    withTheme,
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
    const [sort, setSort] = useState<SortDirection | false>(false);
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
