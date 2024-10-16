//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';

import { faker } from '@dxos/random';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { type SimulatorProps, createTable, createItems, useSimulator } from './testing';

faker.seed(0);

type StoryProps = {
  rows?: number;
} & Pick<SimulatorProps, 'insertInterval' | 'updateInterval'>;

const Story = ({ rows = 10, ...props }: StoryProps) => {
  const table = useMemo(() => createTable(), []);
  const items = useMemo(() => createItems(rows), [rows]);
  useSimulator({ table, items, ...props });
  return <Table table={table} data={items} />;
};

export default {
  title: 'plugin-table/table-next',
  component: Table,
  render: Story,
  decorators: [withSignals, withTheme, withLayout({ fullscreen: true })],
};

export const Default: StoryObj<StoryProps> = {};

export const ManyItems: StoryObj<StoryProps> = {
  args: {
    rows: 1000,
    updateInterval: 1,
  },
};

export const Mutations: StoryObj<StoryProps> = {
  args: {
    rows: 0,
    insertInterval: 100,
  },
};
