//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { useCallback, useMemo } from 'react';

import { faker } from '@dxos/random';
import { useDefaultValue } from '@dxos/react-ui';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Table } from './Table';
import { type SimulatorProps, createItems, createTable, useSimulator } from '../testing';

faker.seed(0);

type StoryProps = {
  rows?: number;
} & Pick<SimulatorProps, 'insertInterval' | 'updateInterval'>;

const Story = (props: StoryProps) => {
  const getDefaultRows = useCallback(() => 10, []);
  const rows = useDefaultValue(props.rows, getDefaultRows);
  const table = useMemo(() => createTable(), []);
  const items = useMemo(() => createItems(rows), [rows]);
  const simulatorProps = useMemo(() => ({ table, items, ...props }), [table, items, props]);
  useSimulator(simulatorProps);

  return (
    <div className='relative is-full max-is-max min-is-0 min-bs-0'>
      <Table table={table} data={items} />
    </div>
  );
};

export default {
  title: 'plugin-table/Table',
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
