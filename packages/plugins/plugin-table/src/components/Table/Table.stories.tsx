//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type MutableSchema } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { Filter, useSpaces, useQuery, create, getSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useDefaultValue } from '@dxos/react-ui';
import { ViewEditor } from '@dxos/react-ui-data';
import { ViewProjection, ViewType, type FieldType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { useTableModel } from '../../hooks';
import translations from '../../translations';
import { TableType } from '../../types';
import { Toolbar } from '../Toolbar';
import { createEmptyTable, createItems, createTable, type SimulatorProps, useSimulator } from '../testing';

//
// Story components.
//

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const tables = useQuery(space, Filter.schema(TableType));
  const [table, setTable] = useState<TableType | undefined>();
  const [schema, setSchema] = useState<MutableSchema>();
  useEffect(() => {
    if (tables.length > 0) {
      const table = tables[0];
      setTable(table);
      if (table.view) {
        setSchema(space.db.schemaRegistry.getSchema(table.view.query.__typename));
      }
    }
  }, [tables]);

  const objects = useQuery(space, schema ? Filter.schema(schema) : () => false, undefined, [schema]);
  const filteredObjects = useGlobalFilteredObjects(objects);
  const handleDeleteRow = useCallback((row: any) => space.db.remove(row), [space]);

  // TODO(ZaymonFC): Reimplement these with the new schema manipulation features.
  // const handleAddColumn = useCallback(
  //   (field: any) => {
  //     if (table && table.schema?.schema && table.view) {
  //       addFieldToView(table.schema, table.view, field);
  //     }
  //   },
  //   [table],
  // );
  // const handleDeleteColumn = useCallback(
  //   (field: any) => {
  //     if (table && table.schema?.schema && table.view) {
  //       removeFieldFromView(table.schema, table.view, field);
  //     }
  //   },
  //   [table],
  // );

  const handleAction = useCallback(
    (action: { type: string }) => {
      switch (action.type) {
        case 'on-thread-create': {
          console.log('Thread creation triggered');
          break;
        }
        case 'add-row': {
          if (table) {
            const space = getSpace(table);
            if (space && schema) {
              space.db.add(create(schema, {}));
            }
            break;
          }
        }
      }
    },
    [table, spaces],
  );

  const projection = useMemo(() => {
    if (!schema || !table?.view) {
      return;
    }

    return new ViewProjection(schema, table.view);
  }, [schema, table?.view]);

  const model = useTableModel({
    table,
    projection,
    objects: filteredObjects,
    onDeleteRow: handleDeleteRow,
    // onAddColumn: handleAddColumn,
    // onDeleteColumn: handleDeleteColumn,
  });

  if (!schema || !table) {
    return <div />;
  }

  return (
    <div className='grid grid-cols-[1fr_256px] w-dvw h-dvh'>
      <div className='flex flex-col h-full'>
        <div className='border-b border-separator flex-none'>
          <Toolbar.Root onAction={handleAction}>
            <Toolbar.Separator />
            <Toolbar.Actions />
          </Toolbar.Root>
        </div>
        <div className='relative is-full max-is-max min-is-0 min-bs-0'>
          <Table model={model} />
        </div>
      </div>
      <div className='border-l border-separator -mt-px flex flex-col h-full'>
        <div className='flex-none'>{table.view && <ViewEditor schema={schema} view={table?.view} />}</div>
        <div className='flex-1 min-h-0 overflow-auto'>
          <pre className='text-[10px] pli-2 font-mono text-wrap'>{JSON.stringify(table, null, 2)}</pre>
        </div>
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

  const handleDeleteRow = useCallback((row: any) => {
    itemsRef.current.splice(itemsRef.current.indexOf(row), 1);
  }, []);

  const handleAddColumn = useCallback(
    (field: FieldType) => {
      if (table && table.view) {
        table.view.fields.push(field);
      }
    },
    [table],
  );

  const handleDeleteColumn = useCallback(
    (field: FieldType) => {
      if (table && table.view) {
        const fieldPosition = table.view.fields.indexOf(field);
        table.view.fields.splice(fieldPosition, 1);
      }
    },
    [table],
  );

  const model = useTableModel({
    table,
    objects: items as any,
    onDeleteRow: handleDeleteRow,
    onAddColumn: handleAddColumn,
    onDeleteColumn: handleDeleteColumn,
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

const meta: Meta<typeof Table> = {
  title: 'plugins/plugin-table/Table',
  component: Table,
  render: DefaultStory,
  parameters: { translations },
  decorators: [
    withClientProvider({
      types: [TableType, ViewType],
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
