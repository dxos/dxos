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
import { TableType } from '../../types';

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

const table = create(TableType, {
  props: [
    { id: 'name', label: 'Name' },
    { id: 'age', label: 'Age' },
    { id: 'active', label: 'Active' },
  ],
});

const useSimulateCollaborativeUpdates = (data: any[], table: TableType, intervalMs: number, isEnabled: boolean) => {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const mutateRandomCell = () => {
      const rowIndex = Math.floor(Math.random() * data.length);
      const columnIndex = Math.floor(Math.random() * table.props.length);
      const column = table.props[columnIndex];
      const row = data[rowIndex];

      const columnId = column.id!;

      switch (typeof row[columnId]) {
        case 'string': {
          row[columnId] = `Updated ${Date.now()}`;
          break;
        }
        case 'number': {
          row[columnId] = Math.floor(Math.random() * 100);
          break;
        }
        case 'boolean': {
          row[columnId] = !row[columnId];
          break;
        }
      }
    };

    const intervalId = setInterval(mutateRandomCell, intervalMs);
    return () => clearInterval(intervalId);
  }, [data, table.props, intervalMs, isEnabled]);
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
      <Table table={table} data={data} />
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
  useSimulateCollaborativeUpdates(data, table, updateIntervalMs, simulateCollaborativeCellUpdates);

  return <Table table={table} data={data} />;
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

  return <Table table={table} data={data} />;
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
