//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type MutableSchema } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { Filter, useSpaces, useQuery, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useDefaultValue } from '@dxos/react-ui';
import { ViewEditor } from '@dxos/react-ui-data';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { ViewProjection, ViewType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table, type TableController } from './Table';
import { useTableModel } from '../../hooks';
import translations from '../../translations';
import { TableType } from '../../types';
import { initializeTable } from '../../util';
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

  useEffect(() => {
    if (space && table && !table.view) {
      initializeTable(space, table);
    }
  }, [space, table]);

  const projection = useMemo(() => {
    if (!schema || !table?.view) {
      return;
    }

    return new ViewProjection(schema, table.view);
  }, [schema, table?.view]);

  const objects = useQuery(space, schema ? Filter.schema(schema) : () => false, undefined, [schema]);
  const filteredObjects = useGlobalFilteredObjects(objects);

  const handleAddRow = useCallback(() => {
    if (space && schema) {
      space.db.add(create(schema, {}));
    }
  }, [space, schema]);

  const handleDeleteColumn = useCallback(
    (property: string) => {
      if (projection) {
        projection.deleteFieldProjection(property);
      }
    },
    [table, projection],
  );

  const handleDeleteRow = useCallback(
    (_: number, object: any) => {
      space.db.remove(object);
    },
    [space],
  );

  const handleAction = useCallback(
    (action: { type: string }) => {
      switch (action.type) {
        case 'on-thread-create': {
          console.log('Thread creation triggered');
          break;
        }
        case 'add-row': {
          handleAddRow();
        }
      }
    },
    [table, spaces],
  );

  const tableRef = useRef<TableController>(null);
  const model = useTableModel({
    table,
    projection,
    objects: filteredObjects,
    onDeleteRow: handleDeleteRow,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: (cell) => tableRef.current?.update(cell),
    onRowOrderChanged: () => tableRef.current?.update(),
  });

  if (!schema || !table) {
    return <div />;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      <div className='flex flex-col h-full overflow-hidden'>
        <Toolbar.Root classNames='border-b border-separator' onAction={handleAction}>
          <Toolbar.Separator />
          <Toolbar.Actions />
        </Toolbar.Root>
        <Table.Root>
          <Table.Main ref={tableRef} model={model} onAddRow={handleAddRow} />
        </Table.Root>
      </div>
      <div className='flex flex-col h-full border-l border-separator'>
        {table.view && <ViewEditor schema={schema} view={table.view} onDelete={handleDeleteColumn} />}
        <SyntaxHighlighter language='json' className='w-full text-xs'>
          {JSON.stringify(table.view, null, 2)}
        </SyntaxHighlighter>
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

  const handleDeleteColumn = useCallback(
    (property: string) => {
      if (table && table.view) {
        const fieldPosition = table.view.fields.findIndex((field) => field.property === property);
        table.view.fields.splice(fieldPosition, 1);
      }
    },
    [table],
  );

  const tableRef = useRef<TableController>(null);
  const model = useTableModel({
    table,
    objects: items as any[],
    onDeleteRow: handleDeleteRow,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: (cell) => tableRef.current?.update(cell),
    onRowOrderChanged: () => tableRef.current?.update(),
  });

  return (
    <Table.Root>
      <Table.Main ref={tableRef} model={model} />
    </Table.Root>
  );
};

//
// Story definitions.
//

const meta: Meta<typeof Table> = {
  title: 'plugins/plugin-table/Table',
  component: Table.Main as any,
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

type Story = StoryObj<StoryProps>;

export const Default = {};

export const Mutations: Story = {
  render: TablePerformanceStory,
  args: {
    rows: 1000,
    updateInterval: 1,
  },
};

export const RapidInsertions: Story = {
  render: TablePerformanceStory,
  args: {
    rows: 0,
    insertInterval: 100,
  },
};
