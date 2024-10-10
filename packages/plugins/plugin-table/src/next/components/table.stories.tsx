//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useMemo } from 'react';

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { type WithClientProviderProps, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { type ColumnDefinition } from '../table';

faker.seed(0);

const makeData = (n: number) => {
  const { data } = create({
    data: Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      name: faker.person.fullName(),
      age: faker.number.int({ min: 20, max: 70 }),
      active: faker.datatype.boolean(),
    })),
  });
  return data;
};

const columnDefinitions: ColumnDefinition[] = [
  { id: 'name', dataType: 'string', headerLabel: 'Name', accessor: (row: any) => row.name },
  { id: 'age', dataType: 'number', headerLabel: 'Age', accessor: (row: any) => row.age },
  { id: 'active', dataType: 'boolean', headerLabel: 'Active', accessor: (row: any) => row.active },
] as const;

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
        case 'string': {
          (row as any)[column.id] = `Updated ${Date.now()}`;
          break;
        }
        case 'number': {
          (row as any)[column.id] = Math.floor(Math.random() * 100);
          break;
        }
        case 'boolean': {
          (row as any)[column.id] = !(row as any)[column.id];
          break;
        }
      }
    };

    const intervalId = setInterval(mutateRandomCell, intervalMs);
    return () => clearInterval(intervalId);
  }, [data, columnDefinitions, intervalMs, isEnabled]);
};

const useSimulateRowAdditions = (data: any[], intervalMs: number, isEnabled: boolean) => {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const addNewRow = () => {
      const newRow = makeData(1)[0];
      data.unshift(newRow);
    };

    const intervalId = setInterval(addNewRow, intervalMs);
    return () => clearInterval(intervalId);
  }, [data, intervalMs, isEnabled]);
};

const DefaultStory = () => {
  const data = useMemo(() => makeData(100), []);

  return (
    <div>
      <Table columnDefinitions={columnDefinitions} data={data} />
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
  const data = useMemo(() => makeData(rowCount), [rowCount]);

  useSimulateCollaborativeUpdates(data, columnDefinitions, updateIntervalMs, simulateCollaborativeCellUpdates);

  return <Table columnDefinitions={columnDefinitions} data={data} />;
};

export const LargeDataSet = {
  render: (args: { rowCount: number; updateIntervalMs: number; simulateCollaborativeCellUpdates: boolean }) => (
    <LargeDataStory {...args} />
  ),
  args: {
    rowCount: 1000,
    simulateCollaborativeCellUpdates: true,
    updateIntervalMs: 1,
  },
};

const RowAdditionStory = ({
  initialRowCount,
  updateIntervalMs,
  simulateRowAdditions,
}: {
  initialRowCount: number;
  updateIntervalMs: number;
  simulateRowAdditions: boolean;
}) => {
  const data = useMemo(() => makeData(initialRowCount), [initialRowCount]);

  useSimulateRowAdditions(data, updateIntervalMs, simulateRowAdditions);

  return <Table columnDefinitions={columnDefinitions} data={data} />;
};

export const RowAddition = {
  render: (args: { initialRowCount: number; updateIntervalMs: number; simulateRowAdditions: boolean }) => (
    <RowAdditionStory {...args} />
  ),
  args: {
    initialRowCount: 1,
    simulateRowAdditions: true,
    updateIntervalMs: 100,
  },
};

const clientProps: WithClientProviderProps = {
  createIdentity: true,
  createSpace: true,
};

export default {
  title: 'plugin-table/table-next',
  component: DefaultStory,
  decorators: [withClientProvider(clientProps), withTheme, withLayout({ fullscreen: true })],
  parameters: { layout: 'fullscreen' },
};

export const Default = {
  render: () => <DefaultStory />,
};
