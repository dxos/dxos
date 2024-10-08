//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useEffect } from 'react';

import { create } from '@dxos/echo-schema';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TableComponent } from './Table';
import { type ColumnDefinition } from '../table';

registerSignalRuntime();

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

const useSimulateCollaborativeUpdates = (
  data: any[],
  columnDefinitions: ColumnDefinition[],
  intervalMs: number,
  isEnabled: boolean,
) => {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

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

    const intervalId = setInterval(mutateRandomCell, intervalMs);
    return () => clearInterval(intervalId);
  }, [data, columnDefinitions, intervalMs, isEnabled]);
};

const DefaultStory = () => {
  const data = React.useMemo(() => makeData(100), []);

  return (
    <div>
      <TableComponent columnDefinitions={columnDefinitions} data={data} />
    </div>
  );
};

const LargeDataStory = ({
  rowCount,
  updateIntervalMs,
  simulateCollaborativeCellUpdates,
}: {
  rowCount: number;
  updateIntervalMs: number;
  simulateCollaborativeCellUpdates: boolean;
}) => {
  const data = React.useMemo(() => makeData(rowCount), [rowCount]);

  useSimulateCollaborativeUpdates(data, columnDefinitions, updateIntervalMs, simulateCollaborativeCellUpdates);

  return <TableComponent columnDefinitions={columnDefinitions} data={data} />;
};

export default {
  title: 'plugin-table/table-next',
  component: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { layout: 'fullscreen' },
};

export const Default = {
  render: () => <ClientRepeater component={DefaultStory} createIdentity createSpace />,
};

export const LargeDataSet = {
  render: (args: { rowCount: number; updateIntervalMs: number; simulateCollaborativeCellUpdates: boolean }) => (
    <ClientRepeater component={() => <LargeDataStory {...args} />} createIdentity createSpace />
  ),
  args: {
    rowCount: 10000,
    simulateCollaborativeCellUpdates: false,
    updateIntervalMs: 1,
  },
};
