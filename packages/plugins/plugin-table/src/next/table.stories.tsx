//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { effect } from '@preact/signals-core';
import React, { useEffect, useRef } from 'react';

import { create } from '@dxos/echo-schema';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { ClientRepeater } from '@dxos/react-client/testing';
import { type DxGridElement, Grid } from '@dxos/react-ui-grid';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { useTable } from './hooks/';
import { type ColumnDefinition } from './table';

registerSignalRuntime();

const DevTools = ({ table }: any) => {
  const { rows: _rows, ...data } = table;

  return (
    <div className='fixed bottom-1 right-1 p-1 bg-neutral-800 text-white text-xs font-mono overflow-auto max-w-[50vw] shadow-lg border border-neutral-900 rounded-xl'>
      <pre>{JSON.stringify({ data }, null, 2)}</pre>
    </div>
  );
};

const makeData = (n: number) => {
  const { data } = create({
    data: Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      name: `Person ${i + 1}`,
      age: Math.floor(Math.random() * 50) + 20,
      active: Math.random() > 0.5,
    })),
  });
  return data;
};

const columnDefinitions: ColumnDefinition[] = [
  { id: 'name', dataType: 'string', headerLabel: 'Name', accessor: (row: any) => row.name },
  { id: 'age', dataType: 'number', headerLabel: 'Age', accessor: (row: any) => row.age },
  { id: 'active', dataType: 'boolean', headerLabel: 'Active', accessor: (row: any) => row.active },
];

const useStressTest = (data: any, columnDefinitions: ColumnDefinition[]) => {
  // Stress test: Mutate a random cell every millisecond
  useEffect(() => {
    const mutateRandomCell = () => {
      const rowIndex = Math.floor(Math.random() * data.length);
      const columnIndex = Math.floor(Math.random() * columnDefinitions.length);
      const column = columnDefinitions[columnIndex];
      const row = data[rowIndex];

      switch (column.dataType) {
        case 'string':
          (row as any)[column.id] = `Updated ${Date.now()}`;
          break;
        case 'number':
          (row as any)[column.id] = Math.floor(Math.random() * 100);
          break;
        case 'boolean':
          (row as any)[column.id] = !(row as any)[column.id];
          break;
      }
    };

    const intervalId = setInterval(mutateRandomCell, 1);
    return () => clearInterval(intervalId);
  }, [data, columnDefinitions]);
};

const Story = () => {
  const data = React.useMemo(() => makeData(50000), []);
  const gridRef = useRef<DxGridElement>(null);
  const { table, columnMeta, gridCells, dispatch } = useTable(columnDefinitions, data, gridRef);

  useStressTest(data, columnDefinitions);

  return (
    <div>
      {false && <DevTools table={table} />}
      <Grid.Root id='table-v2'>
        <Grid.Content
          ref={gridRef}
          limitRows={table.rowCount.value}
          limitColumns={table.columnDefinitions.length}
          initialCells={gridCells}
          columnDefault={{ size: 120, resizeable: true }}
          rowDefault={{ size: 32, resizeable: true }}
          columns={columnMeta}
          onAxisResize={(event) => {
            if (event.axis === 'col') {
              const columnIndex = parseInt(event.index, 10);
              dispatch({
                type: 'ModifyColumnWidth',
                columnIndex,
                width: event.size,
              });
            }
          }}
        />
      </Grid.Root>
    </div>
  );
};

export default {
  title: 'plugin-table/table-next',
  component: Story,
  render: () => <ClientRepeater component={Story} createIdentity createSpace />,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { layout: 'fullscreen' },
};

export const Default = {};
