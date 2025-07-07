//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Grid, type GridContentProps, type GridRootProps } from './Grid';
import { type GridLayout } from './types';

type StoryProps = GridRootProps & GridContentProps;

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-board/Grid',
  component: Grid.Root,
  render: (args) => {
    const [items, setItems] = useState(args.items ?? []);
    const [layout, setLayout] = useState<GridLayout>(args.layout ?? { tiles: {} });

    const handleAdd = useCallback<NonNullable<GridRootProps['onAdd']>>(
      (position) => {
        const id = items.length.toString();
        setItems([...items, { id }]);
        setLayout((layout) => ({ ...layout, tiles: { ...layout.tiles, [id]: position } }));
      },
      [items, layout],
    );

    const handleDelete = useCallback<NonNullable<GridRootProps['onDelete']>>(
      (id) => {
        setItems(items.filter((item) => item.id !== id));
        setLayout((layout) => ({
          ...layout,
          tiles: Object.fromEntries(Object.entries(layout.tiles).filter(([tileId]) => tileId !== id)),
        }));
      },
      [items, layout],
    );

    return (
      <Grid.Root layout={layout} onAdd={handleAdd} onDelete={handleDelete}>
        <Grid.Controls />
        <Grid.Content items={items}>
          <Grid.Background />
        </Grid.Content>
      </Grid.Root>
    );
  },
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    items: [{ id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }, { id: '6' }],
    margin: 300,
    grid: {
      size: { width: 300, height: 300 },
      gap: 16,
    },
    layout: {
      tiles: {
        '0': { x: 0, y: 0 },
        '1': { x: -3, y: -2 },
        '2': { x: 3, y: 2 },
        '3': { x: -1, y: 0, width: 1, height: 2 },
        '4': { x: -1, y: -1, width: 3 },
        '5': { x: 1, y: 0 },
        '6': { x: 0, y: 1, width: 2 },
      },
    },
  },
};
