//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type EchoSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { faker } from '@dxos/random';
import { Filter, useQuery, create } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { useDefaultValue } from '@dxos/react-ui';
import { ViewEditor } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { ViewProjection, ViewType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table, type TableController } from './Table';
import { useTableModel, type UseTableModelParams } from '../../hooks';
import { TablePresentation } from '../../model';
import translations from '../../translations';
import { TableType } from '../../types';
import { initializeTable } from '../../util';
import { TableToolbar } from '../TableToolbar';
import { createItems, createTable, type SimulatorProps, useSimulator } from '../testing';

// NOTE(ZaymonFC): We rely on this seed being 0 in the smoke tests.
faker.seed(0);

//
// Story components.
//

const DefaultStory = () => {
  const { space } = useClientProvider();
  invariant(space);

  const tables = useQuery(space, Filter.schema(TableType));
  const [table, setTable] = useState<TableType>();
  const [schema, setSchema] = useState<EchoSchema>();
  useEffect(() => {
    if (space && tables.length && !table) {
      const table = tables[0];
      invariant(table.view);
      setTable(table);
      setSchema(space.db.schemaRegistry.getSchema(table.view.target!.query.type));
    }
  }, [space, tables]);

  const projection = useMemo(() => {
    if (schema && table?.view?.target) {
      return new ViewProjection(schema, table.view.target);
    }
  }, [schema, table?.view?.target]);

  const objects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const handleInsertRow = useCallback(() => {
    if (space && schema) {
      space.db.add(create(schema, {}));
    }
  }, [space, schema]);

  const handleDeleteRows = useCallback(
    (_: number, objects: any[]) => {
      for (const object of objects) {
        space.db.remove(object);
      }
    },
    [space],
  );

  const handleDeleteColumn = useCallback(
    (fieldId: string) => {
      if (projection) {
        projection.deleteFieldProjection(fieldId);
      }
    },
    [table, projection],
  );

  const tableRef = useRef<TableController>(null);
  const handleCellUpdate = useCallback((cell: any) => {
    tableRef.current?.update?.(cell);
  }, []);

  const handleRowOrderChanged = useCallback(() => {
    tableRef.current?.update?.();
  }, []);

  const model = useTableModel({
    table,
    projection,
    objects: filteredObjects,
    onInsertRow: handleInsertRow,
    onDeleteRows: handleDeleteRows,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: handleCellUpdate,
    onRowOrderChanged: handleRowOrderChanged,
  });

  const presentation = useMemo(() => {
    if (model) {
      return new TablePresentation(model);
    }
  }, [model]);

  const handleAction = useCallback(
    (action: { type: string }) => {
      switch (action.type) {
        case 'on-thread-create': {
          console.log('Thread creation triggered');
          break;
        }
        case 'add-row': {
          handleInsertRow();
          break;
        }
        case 'save-view': {
          model?.saveView();
          break;
        }
      }
    },
    [table, model],
  );

  const onTypenameChanged = useCallback(
    (typename: string) => {
      if (table?.view?.target) {
        schema?.updateTypename(typename);
        table.view.target.query.type = typename;
      }
    },
    [table?.view?.target, schema],
  );

  if (!schema || !table) {
    return <div />;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      <div className='grid grid-rows-[min-content_1fr] min-bs-0 overflow-hidden'>
        <TableToolbar classNames='border-b border-separator' onAction={handleAction} />
        <Table.Root>
          <Table.Main ref={tableRef} model={model} presentation={presentation} ignoreAttention />
        </Table.Root>
      </div>
      <div className='flex flex-col h-full border-l border-separator overflow-y-auto'>
        {table.view?.target && (
          <ViewEditor
            registry={space?.db.schemaRegistry}
            schema={schema}
            view={table.view.target!}
            onTypenameChanged={onTypenameChanged}
            onDelete={handleDeleteColumn}
          />
        )}

        <SyntaxHighlighter language='json' className='w-full text-xs'>
          {JSON.stringify({ view: table.view?.target, schema }, null, 2)}
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

  const handleDeleteRows = useCallback<NonNullable<UseTableModelParams<any>['onDeleteRows']>>((row) => {
    itemsRef.current.splice(row, 1);
  }, []);

  const handleDeleteColumn = useCallback<NonNullable<UseTableModelParams<any>['onDeleteColumn']>>(
    (fieldId) => {
      if (table && table.view?.target) {
        const fieldPosition = table.view.target!.fields.findIndex((field) => field.id === fieldId);
        table.view.target!.fields.splice(fieldPosition, 1);
      }
    },
    [table],
  );

  const tableRef = useRef<TableController>(null);
  const model = useTableModel({
    table,
    objects: items as any[],
    onDeleteRows: handleDeleteRows,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: (cell) => tableRef.current?.update?.(cell),
    onRowOrderChanged: () => tableRef.current?.update?.(),
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

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-table/Table',
  component: Table.Main as any,
  render: DefaultStory,
  parameters: { translations },
  decorators: [
    withClientProvider({
      types: [TableType, ViewType],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }) => {
        const table = space.db.add(create(TableType, {}));
        const schema = await initializeTable({ space, table, initialRow: false });
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            create(schema, {
              name: faker.person.fullName(),
            }),
          );
        });
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
