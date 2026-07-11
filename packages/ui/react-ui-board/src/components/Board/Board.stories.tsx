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

import { Board, type BoardRootProps } from './Board';
import { type GridMode, type Layout, rejectIfNoFit, resizeToFit } from './engine';

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

// 12-column board; tile sizes capped at 2x2, clustered around the board centre (6,6) rather than the
// top-left, so the initial view (centred on mount) shows the tiles.
const defaultLayout: Layout = {
  items: {
    '0': { x: 4, y: 4, w: 2, h: 2 },
    '1': { x: 6, y: 4, w: 2, h: 1 },
    '2': { x: 4, y: 6, w: 2, h: 2 },
    '3': { x: 6, y: 6, w: 2, h: 2 },
    '4': { x: 6, y: 5, w: 2, h: 1 },
  },
};

// A 12x12 initial board.
const defaultBounds = { columns: 12, rows: 12 };

type StoryArgs = BoardRootProps & { items: TestItem[] };

const DefaultStory = ({ layout: layoutProp, items: itemsProp, mode, ...props }: StoryArgs) => {
  const [items, setItems] = useState(itemsProp ?? testItems);
  const [layout, setLayout] = useState<Layout>(layoutProp ?? defaultLayout);

  const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
    (position) => {
      const id = items.length.toString();
      setItems([...items, { id, title: `Widget ${id}` }]);
      setLayout((layout) => ({ ...layout, items: { ...layout.items, [id]: position } }));
    },
    [items],
  );

  const handleDelete = useCallback<NonNullable<BoardRootProps['onDelete']>>((id: string) => {
    setItems((items) => items.filter((item) => item.id !== id));
    setLayout((layout) => {
      const { [id]: _removed, ...rest } = layout.items;
      return { ...layout, items: rest };
    });
  }, []);

  return (
    <Dnd.Root>
      <Board.Root
        {...props}
        layout={layout}
        mode={mode}
        bounds={defaultBounds}
        onChange={setLayout}
        onAdd={handleAdd}
        onDelete={handleDelete}
      >
        {/* Scroll viewport: sized to the full grid bounds; auto-scrolls when dragging/resizing near an edge. */}
        <Board.Container classNames='absolute inset-0'>
          <Board.Viewport>
            <Board.Backdrop />
            <Board.Content>
              {items.map((item) => {
                const itemLayout = layout.items[item.id];
                return itemLayout ? (
                  <Board.Cell item={item} layout={itemLayout} key={item.id} title={<Card.Text>{item.title}</Card.Text>}>
                    {item.image ? <img src={item.image} alt='' className='size-full object-cover' /> : null}
                  </Board.Cell>
                ) : null;
              })}
            </Board.Content>
          </Board.Viewport>
        </Board.Container>
      </Board.Root>
    </Dnd.Root>
  );
};

const meta = {
  title: 'ui/react-ui-board/Board',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default resolver (`pushToFit`): dropping/resizing pushes occupants out of the way. */
export const Default: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
  },
};

/** `pack` mode: after a move/resize the layout compacts upward. */
export const Pack: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'pack' satisfies GridMode,
  },
};

/** Card-sized cells (the default is compact/half-size). */
export const Large: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
    cellSize: { width: cardDefaultInlineSize, height: cardDefaultInlineSize },
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

/**
 * `resizeToFit` resolver: a tile dropped/resized onto a neighbour shrinks to the free space rather
 * than pushing others (rejects if not even 1×1 fits).
 */
export const ResizeToFit: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
    resolver: resizeToFit,
  },
};

/**
 * `rejectIfNoFit` resolver: a drop is only accepted where the tile fits in free space; otherwise the
 * tile springs back and nothing else moves.
 */
export const RejectIfNoFit: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
    resolver: rejectIfNoFit,
  },
};
