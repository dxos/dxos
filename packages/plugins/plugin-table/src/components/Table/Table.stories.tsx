//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { Filter, useSpaces, useQuery, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useDefaultValue } from '@dxos/react-ui';
import { ViewEditor } from '@dxos/react-ui-data';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { useTableModel } from '../../hooks';
import { TableType } from '../../types';
import { Toolbar } from '../Toolbar';
import { createEmptyTable, createItems, createTable, type SimulatorProps, useSimulator } from '../testing';

//
// Story components.
//

const DefaultStory = () => {
  const [table, setTable] = useState<TableType | undefined>();
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const tables = useQuery(space, Filter.schema(TableType));
  const objects = useQuery(space, table?.schema ? Filter.schema(table.schema) : () => false, undefined, [
    table?.schema,
  ]);
  const filteredObjects = useGlobalFilteredObjects(objects);

  useEffect(() => {
    if (tables.length > 0) {
      setTable(tables[0]);
    }
  }, [tables]);

  const handleDeleteRow = useCallback((row: any) => space.db.remove(row), [space]);
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

  const model = useTableModel({
    table: table!,
    objects: filteredObjects,
    onDeleteRow: handleDeleteRow,
  });

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
          <Table model={model} />
        </div>
      </div>
      <div className='border border-left border-separator -mt-px'>
        {table.view && <ViewEditor view={table?.view} />}
      </div>
    </div>
  );
};

type StoryProps = {
  rows?: number;
} & Pick<SimulatorProps, 'insertInterval' | 'updateInterval'>;

const TablePerformanceStory = (props: StoryProps) => {
  const getDefaultRows = useCallback(() => 10, []);
  const rows = useDefaultValue(props.rows, getDefaultRows);
  const table = useMemo(() => createTable(), []);
  const items = useMemo(() => createItems(rows), [rows]);
  const itemsRef = useRef(items);
  const simulatorProps = useMemo(() => ({ table, items, ...props }), [table, items, props]);
  useSimulator(simulatorProps);

  const onDeleteRow = useCallback((row: any) => {
    itemsRef.current.splice(itemsRef.current.indexOf(row), 1);
  }, []);

  const model = useTableModel({
    table,
    objects: items as any,
    onDeleteRow,
  });

  return (
    <div className='relative is-full max-is-max min-is-0 min-bs-0'>
      <Table model={model} />
    </div>
  );
};

//
// Story definitions.
//

export const Default = {};

export const Mutations: StoryObj = {
  render: TablePerformanceStory,
  args: {
    rows: 1000,
    updateInterval: 1,
  },
};

export const RapidInsertions: StoryObj = {
  render: TablePerformanceStory,
  args: {
    rows: 0,
    insertInterval: 100,
  },
};

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
