//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useState } from 'react';

import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { Filter, useSpaces, useQuery, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { ViewEditor } from '@dxos/react-ui-data';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { useTableModel } from '../../hooks';
import { TableType } from '../../types';
import { Toolbar } from '../Toolbar';
import { createEmptyTable } from '../testing';

const DefaultStory = () => {
  const spaces = useSpaces();
  const [table, setTable] = useState<TableType | undefined>();
  const space = spaces[spaces.length - 1];

  const tableObjects = useQuery(space, Filter.schema(TableType));
  useEffect(() => {
    if (tableObjects.length) {
      setTable(tableObjects[0]);
    }
  }, [tableObjects]);

  const queriedObjects = useQuery(space, table?.schema ? Filter.schema(table.schema) : () => false, undefined, [
    table?.schema,
  ]);

  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const tableModel = useTableModel({
    table: table!,
    objects: filteredObjects,
  });

  const handleAction = useCallback(
    (action: { type: string }) => {
      switch (action.type) {
        case 'on-thread-create': {
          console.log('Thread creation triggered');
          break;
        }
        case 'add-row': {
          const lastSpace = spaces[spaces.length - 1];
          if (table?.schema && lastSpace) {
            lastSpace.db.add(create(table.schema, {}));
          }
          break;
        }
      }
    },
    [table, spaces],
  );

  if (!table) {
    return null;
  }

  return (
    <div className='grid grid-cols-[1fr_256px] h-dvh w-dvw'>
      <div>
        <div className='border-b border-separator'>
          <Toolbar.Root onAction={handleAction}>
            <Toolbar.Separator />
            <Toolbar.Actions />
          </Toolbar.Root>
        </div>
        <div className='relative is-full max-is-max min-is-0 min-bs-0'>
          <Table tableModel={tableModel} />
        </div>
      </div>
      <div className='border border-left border-separator -mt-px'>
        {table.view && <ViewEditor view={table?.view} />}
      </div>
    </div>
  );
};

export const Default = {};

const meta: Meta<typeof Table> = {
  title: 'plugins/plugin-table/Table',
  component: Table,
  render: DefaultStory as any,
  decorators: [
    withClientProvider({
      types: [TableType],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: ({ space }) => {
        space.db.add(createEmptyTable());
      },
    }),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export default meta;
