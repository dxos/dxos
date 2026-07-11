//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { Card } from '@dxos/react-ui';
import { Dnd } from '@dxos/react-ui-dnd';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { cardDefaultInlineSize } from '@dxos/ui-theme';

import { translations } from '#translations';

import { type GridItem, type GridLayout, type GridMode } from './engine';
import { Grid, type GridRootProps } from './Grid';

type TestItem = {
  id: string;
  title: string;
  image?: string;
};

const titles = ['Sales', 'Revenue', 'Users', 'Latency', 'Errors'];

const testItems: TestItem[] = titles.map((title, index) => ({ id: String(index), title }));

// Same items with a random poster image per tile (seeded for stable stories).
const posterItems: TestItem[] = ((seed = 42) =>
  titles.map((title, index) => {
    // Deterministic pseudo-random id for picsum so stories are stable without Math.random.
    const pic = (seed * (index + 7)) % 1000;
    return { id: String(index), title, image: `https://picsum.photos/seed/${pic}/600/400` };
  }))();

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
                  <Grid.Cell item={item} layout={itemLayout} key={item.id} title={<Card.Text>{item.title}</Card.Text>}>
                    {item.image ? <img src={item.image} alt='' className='size-full object-cover' /> : null}
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

/** Approximately half-size cells to check the layout at a denser grid scale. */
export const Compact: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
    cellSize: { width: cardDefaultInlineSize / 2, height: cardDefaultInlineSize / 2 },
  },
};

/** Tiles with a poster image filling the body (title still in the header). */
export const Media: Story = {
  args: {
    items: posterItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
  },
};
