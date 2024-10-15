//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { type SimulatorProps, table, createItems, useSimulator } from './testing';

faker.seed(0);

type StoryProps = {
  rows?: number;
} & Pick<SimulatorProps, 'table' | 'insertInterval' | 'updateInterval'>;

const Story = ({ table, rows = 10, ...props }: StoryProps) => {
  const items = useMemo(() => createItems(rows), [rows]);
  useSimulator({ table, items, ...props });
  return <Table table={table} data={items} />;
};

export default {
  title: 'plugin-table/table-next',
  render: Story,
  decorators: [withSignals, withTheme, withLayout({ fullscreen: true })],
};

export const Default: StoryObj<StoryProps> = {
  args: {
    table,
  },
};

export const ManyItems: StoryObj<StoryProps> = {
  args: {
    table,
    rows: 1000,
    updateInterval: 1,
  },
};

export const Mutations: StoryObj<StoryProps> = {
  args: {
    table,
    rows: 1,
    updateInterval: 100,
  },
};
