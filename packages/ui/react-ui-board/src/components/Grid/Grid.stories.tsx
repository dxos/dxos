//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { Card } from '@dxos/react-ui';
import { Dnd } from '@dxos/react-ui-dnd';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type GridItem, type GridLayout, type GridMode } from './engine';
import { Grid, type GridRootProps } from './Grid';

type TestItem = {
  id: string;
  title: string;
};

const testItems: TestItem[] = [
  { id: '0', title: 'Sales' },
  { id: '1', title: 'Revenue' },
  { id: '2', title: 'Users' },
  { id: '3', title: 'Latency' },
  { id: '4', title: 'Errors' },
];

const defaultLayout: GridLayout = {
  columns: 8,
  items: [
    { id: '0', x: 0, y: 0, w: 3, h: 2 },
    { id: '1', x: 3, y: 0, w: 2, h: 1 },
    { id: '2', x: 5, y: 0, w: 3, h: 2 },
    { id: '3', x: 0, y: 2, w: 4, h: 2 },
    { id: '4', x: 4, y: 2, w: 4, h: 2 },
  ],
};

type StoryArgs = GridRootProps & { items: TestItem[] };

const DefaultStory = ({ layout: layoutProp, items: itemsProp, mode, ...props }: StoryArgs) => {
  const [items, setItems] = useState(itemsProp ?? testItems);
  const [layout, setLayout] = useState<GridLayout>(layoutProp ?? defaultLayout);

  const handleAdd = useCallback<NonNullable<GridRootProps['onAdd']>>(
    (position: GridItem) => {
      const id = items.length.toString();
      setItems([...items, { id, title: `Widget ${id}` }]);
      setLayout((layout) => ({ ...layout, items: [...layout.items, { ...position, id }] }));
    },
    [items],
  );

  return (
    <Dnd.Root>
      <Grid.Root {...props} layout={layout} mode={mode} onChange={setLayout} onAdd={handleAdd}>
        {/* Scroll viewport: sized to the full grid bounds; auto-scrolls when dragging/resizing near an edge. */}
        <Grid.Container classNames='absolute inset-0'>
          <Grid.Viewport>
            <Grid.Backdrop />
            <Grid.Content>
              {items.map((item) => {
                const itemLayout = layout.items.find((entry) => entry.id === item.id);
                return itemLayout ? (
                  <Grid.Cell item={item} layout={itemLayout} key={item.id}>
                    <Card.Text>{item.title}</Card.Text>
                  </Grid.Cell>
                ) : null;
              })}
            </Grid.Content>
          </Grid.Viewport>
        </Grid.Container>
      </Grid.Root>
    </Dnd.Root>
  );
};

const meta = {
  title: 'ui/react-ui-board/Grid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
  },
};

export const Pack: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'pack' satisfies GridMode,
  },
};
