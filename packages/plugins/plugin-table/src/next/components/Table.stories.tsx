//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';

import { faker } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { type SimulatorProps, makeData, table, useSimulator } from './testing';

faker.seed(0);

type StoryProps = {
  rows?: number;
} & Pick<SimulatorProps, 'interval' | 'insert' | 'update'>;

const Story = ({ rows = 10, interval, insert, update }: StoryProps) => {
  const items = useMemo(() => makeData(rows), [rows]);
  useSimulator({ items, table, interval, insert, update });
  return <Table table={table} data={items} />;
};

export default {
  title: 'plugin-table/table-next',
  render: Story,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
};

export const Default: StoryObj<StoryProps> = {};

export const LargeDataSet: StoryObj<StoryProps> = {
  args: {
    rows: 1000,
    update: true,
    interval: 1,
  },
};

export const RowAddition: StoryObj<StoryProps> = {
  args: {
    rows: 1,
    insert: true,
    interval: 100,
  },
};
