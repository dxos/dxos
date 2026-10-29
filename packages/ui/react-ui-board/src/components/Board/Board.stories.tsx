//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useRef, useState } from 'react';

import { Dnd } from '@dxos/react-ui-dnd';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as UiLayout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { cardDefaultInlineSize } from '@dxos/ui-theme';

import { translations } from '#translations';

import { Board, type BoardController, type BoardRootProps } from './Board.tsx';
import { type GridMode, type GridPosition, type Layout, rejectIfNoFit, resizeToFit } from './engine.ts';

type TestItem = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
};

const NAMES = [
  'Alice Ashe',
  'Bartholomew Okonkwo-Lindqvist',
  'Chen Wei',
  'Dolores Haze',
  'Emeka Nwosu',
  'Fatima al-Zahra',
  'Giovanni Rossi',
  'Hana Kobayashi',
];

const ROLES = [
  'Engineering Manager, Platform Infrastructure and Developer Experience',
  'Designer',
  'Product Lead',
  'Account Executive',
  'Research Scientist',
];

const NOTES = [
  'Owns the sync roadmap.',
  'Met at the Lisbon offsite; follow up about the pilot, the pricing questions and the data-residency requirements their legal team raised.',
  'Prefers async updates.',
  'Introduced us to the hardware partner and has been the main point of contact since the first workshop in March.',
  undefined,
];

// 12x12 board with a tile in each corner, one in the centre, and the rest spread between them with a
// free gutter - exercises the edges (auto-scroll, overscroll, centering a far cell) and leaves room to drop.
const TILE_COLUMNS = [0, 3, 7, 10];

const tilePositions: GridPosition[] = [
  ...TILE_COLUMNS.flatMap((y) => TILE_COLUMNS.map((x) => ({ x, y, w: 2, h: 2 }))),
  { x: 5, y: 5, w: 2, h: 2 },
];

/** Deterministic people-like tiles (no randomness, so stories are stable) with varied text lengths. */
const testItems: TestItem[] = tilePositions.map((_, index) => ({
  id: String(index),
  title: NAMES[index % NAMES.length],
  subtitle: ROLES[index % ROLES.length],
  description: NOTES[(index * 3) % NOTES.length],
}));

// Same items with a poster image per tile (seeded for stable stories).
const posterItems: TestItem[] = ((seed = 42) =>
  testItems.map((item, index) => {
    // Deterministic pseudo-random id for picsum so stories are stable without Math.random.
    const pic = (seed * (index + 7)) % 1000;
    return { ...item, image: `https://picsum.photos/seed/${pic}/600/400` };
  }))();

const defaultLayout: Layout = {
  items: Object.fromEntries(tilePositions.map((position, index) => [String(index), position])),
};

// A 12x12 initial board.
const defaultBounds = { columns: 12, rows: 12 };

/** Card content for a tile's body; the cell itself supplies the `Card.Root` and header. */
const TileContent = ({ item }: { item: TestItem }) => (
  <UiLayout.Flex column gap='xs' classNames='px-2 pb-2 min-w-0'>
    {item.subtitle && <Card.Text truncate>{item.subtitle}</Card.Text>}
    {item.description && (
      <Card.Text variant='muted' lines={3}>
        {item.description}
      </Card.Text>
    )}
  </UiLayout.Flex>
);

type StoryArgs = BoardRootProps & { items: TestItem[] };

const DefaultStory = ({ layout: layoutProp, items: itemsProp, mode, zoom: zoomProp, ...props }: StoryArgs) => {
  const [items, setItems] = useState(itemsProp ?? testItems);
  const [layout, setLayout] = useState<Layout>(layoutProp ?? defaultLayout);
  const [zoom, setZoom] = useState(zoomProp ?? 1);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const controller = useRef<BoardController>(null);

  // Center the newly-selected cell (a story-level choice - the component itself doesn't move on select).
  const handleSelectedChange = useCallback<NonNullable<BoardRootProps['onSelectedChange']>>((next) => {
    setSelected(next);
    const id = next.values().next().value;
    if (id) {
      controller.current?.center(id);
    }
  }, []);

  const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
    (position) => {
      // Derive the id from the max numeric id + 1 so ids stay unique after deletions (not items.length).
      const next = items.reduce((max, item) => Math.max(max, Number.parseInt(item.id) || 0), 0) + 1;
      const id = next.toString();
      // In media mode (existing tiles carry images) give new tiles a poster too; seed it from the id
      // so it's stable per add (matching the seeded posterItems, no Math.random).
      const media = items.some((item) => item.image);
      const image = media ? `https://picsum.photos/seed/${(next * 137 + 7) % 1000}/600/400` : undefined;
      setItems([...items, { id, title: `Widget ${id}`, image }]);
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
        ref={controller}
        layout={layout}
        mode={mode}
        bounds={defaultBounds}
        zoom={zoom}
        onZoomChange={setZoom}
        selected={selected}
        onSelectedChange={handleSelectedChange}
        onChange={setLayout}
        onAdd={handleAdd}
        onDelete={handleDelete}
      >
        {/* Scroll viewport: sized to the full grid bounds; auto-scrolls when dragging/resizing near an edge. */}
        <Panel.Root>
          <Panel.Header>
            <Toolbar.Root>
              <Button.Root
                icon='ph--crosshair--regular'
                iconOnly
                label='Center board'
                onClick={() => controller.current?.center()}
              />
              <Button.Root onClick={() => setZoom(1)} disabled={zoom === 1}>
                100%
              </Button.Root>
            </Toolbar.Root>
          </Panel.Header>
          <Panel.Body asChild>
            <Board.Container>
              <Board.Viewport>
                <Board.Backdrop />
                <Board.Content>
                  {items.map((item) => {
                    const itemLayout = layout.items[item.id];
                    return itemLayout ? (
                      <Board.Cell
                        item={item}
                        layout={itemLayout}
                        key={item.id}
                        title={<Card.Title truncate>{item.title}</Card.Title>}
                      >
                        {item.image ? (
                          <img src={item.image} alt='' className='size-full object-cover' />
                        ) : (
                          <TileContent item={item} />
                        )}
                      </Board.Cell>
                    ) : null;
                  })}
                </Board.Content>
              </Board.Viewport>
              <div className='absolute bottom-4 left-4 z-10 flex flex-col items-end gap-2'>
                <Board.Zoom />
              </div>
              <div className='absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2'>
                <Board.Map classNames='w-40' />
              </div>
            </Board.Container>
          </Panel.Body>
        </Panel.Root>
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
    debug: true,
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
    cellSize: {
      width: cardDefaultInlineSize,
      height: cardDefaultInlineSize,
    },
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

/**
 * Overscroll: the board is padded by half the viewport, so any cell - including the corners - can be
 * scrolled to the centre (select a card and it centres; drag to an edge and keep going).
 */
export const Overscroll: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
    selectionMode: 'single',
    overscroll: true,
  },
};

/** `margin: 1` - one cell of perimeter breathing room around the grid so tiles aren't flush to the
 * board edges (the margin scales with the board when zooming). */
export const Margin: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
    margin: 1,
    debug: true,
  },
};

/** Single-select: clicking a card selects it (clicking it again clears); at most one is selected. */
export const SingleSelect: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
    selectionMode: 'single',
    debug: true,
  },
};

/** Multi-select: click selects only that card; shift-click adds/removes cards from the selection. */
export const MultiSelect: Story = {
  args: {
    items: testItems,
    layout: defaultLayout,
    mode: 'float' satisfies GridMode,
    selectionMode: 'multi',
  },
};
