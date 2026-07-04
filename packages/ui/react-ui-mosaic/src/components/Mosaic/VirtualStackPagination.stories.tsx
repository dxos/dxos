//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, useCallback, useMemo, useState } from 'react';

import { Card, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { useVirtualizerPagination } from '../../hooks';
import { Focus } from '../Focus';
import { Mosaic } from './Mosaic';
import { type MosaicTileProps } from './Tile';

/** Total size of the synthetic, in-memory data source -- no ECHO or other backing service involved. */
const TOTAL_ITEMS = 5_000;
const PAGE_SIZE = 20;
const MAX_WINDOW_SIZE = PAGE_SIZE * 10;

type ListItem = { id: string; index: number };

type Range = { skip: number; limit: number };

/**
 * Windows a plain in-memory array the same way `usePaginatedQuery` windows a live query: a page
 * size, a bounded max window, and loadNext/loadPrevious that grow the window until it hits
 * `MAX_WINDOW_SIZE`, then slide it instead. Demonstrates that `useVirtualizerPagination` only
 * needs a `{ items, loadNext, loadPrevious }` shape -- nothing ECHO-specific.
 */
const usePaginatedItems = (total: number) => {
  const [range, setRange] = useState<Range>({ skip: 0, limit: PAGE_SIZE });

  const items = useMemo<ListItem[]>(() => {
    const count = Math.max(0, Math.min(range.limit, total - range.skip));
    return Array.from({ length: count }, (_, i) => {
      const index = range.skip + i;
      return { id: String(index), index };
    });
  }, [range, total]);

  const loadNext = useCallback(() => {
    setRange((prev) => {
      if (prev.skip + prev.limit >= total) {
        return prev;
      }
      const nextLimit = prev.limit + PAGE_SIZE;
      return nextLimit <= MAX_WINDOW_SIZE
        ? { ...prev, limit: nextLimit }
        : { limit: MAX_WINDOW_SIZE, skip: prev.skip + PAGE_SIZE };
    });
  }, [total]);

  const loadPrevious = useCallback(() => {
    setRange((prev) => (prev.skip === 0 ? prev : { ...prev, skip: Math.max(0, prev.skip - PAGE_SIZE) }));
  }, []);

  return { items, loadNext, loadPrevious, atHead: range.skip === 0 };
};

const ListItemTile: FC<MosaicTileProps<ListItem>> = ({ data, location, current }) => (
  <Mosaic.Tile id={data.id} data={data} location={location} current={current} asChild>
    <Focus.Item asChild>
      <Card.Root>
        <Card.Header>
          <Card.Title>Item #{data.index}</Card.Title>
        </Card.Header>
      </Card.Root>
    </Focus.Item>
  </Mosaic.Tile>
);

const VirtualStackPaginationStory = () => {
  const { items, loadNext, loadPrevious, atHead } = usePaginatedItems(TOTAL_ITEMS);
  const pagination = useMemo(() => ({ loadNext, loadPrevious }), [loadNext, loadPrevious]);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const { onChange } = useVirtualizerPagination({
    items,
    getId: (item) => item.id,
    pagination,
  });

  const range = items.length > 0 ? `${items[0].index}–${items[items.length - 1].index}` : '–';

  return (
    <Mosaic.Root>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <div className='flex grow justify-center'>
              Range {range} of {TOTAL_ITEMS} ({items.length} loaded) {atHead && '(at head)'}
            </div>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Mosaic.Container asChild eventHandler={{ id: 'virtual-stack-pagination', canDrop: () => false }}>
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport ref={setViewport}>
                <Mosaic.VirtualStack
                  Tile={ListItemTile}
                  items={items}
                  draggable={false}
                  getId={(item) => item.id}
                  getScrollElement={() => viewport}
                  estimateSize={() => 56}
                  gap={4}
                  onChange={onChange}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Panel.Content>
      </Panel.Root>
    </Mosaic.Root>
  );
};

const meta: Meta<typeof VirtualStackPaginationStory> = {
  title: 'ui/react-ui-mosaic/Stack/Pagination',
  render: VirtualStackPaginationStory,
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `Mosaic.VirtualStack` paginated by `useVirtualizerPagination` over a plain in-memory array --
 * no ECHO query or `usePaginatedQuery` involved. Scroll down to grow the window, then keep
 * scrolling past `MAX_WINDOW_SIZE` to see it slide (evicting the newest items); scroll back up to
 * slide it back toward the head without a visible jump.
 */
export const Default: Story = {};
