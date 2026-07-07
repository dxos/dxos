//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { type FC, useCallback, useMemo, useState } from 'react';

import { Database, DXN, Feed, Filter, Obj, Order, Query, Type } from '@dxos/echo';
import { usePagination, useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Button, Card, Input, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { useVirtualizerPagination } from '../../hooks';
import { Focus } from '../Focus';
import { Mosaic } from './Mosaic';
import { type MosaicTileProps } from './Tile';

/** Items seeded into the feed on space creation. */
const INITIAL_ITEMS = 100;
const PAGE_SIZE = 20;
const MAX_WINDOW_SIZE = PAGE_SIZE * 10;
/** Default value of the toolbar's "add" count input. */
const DEFAULT_ADD_COUNT = 50;

class CounterItem extends Type.makeObject<CounterItem>(DXN.make('com.example.type.counterItem', '0.1.0'))(
  Schema.Struct({
    index: Schema.Number,
  }),
) {}

const makeItems = (start: number, count: number): CounterItem[] =>
  Array.from({ length: count }, (_, i) => Obj.make(CounterItem, { index: start + i }));

const appendItems = (db: Database.Database, feed: Feed.Feed, start: number, count: number): Promise<void> =>
  Feed.append(feed, makeItems(start, count)).pipe(Effect.provide(Database.layer(db)), Effect.runPromise);

const seedFeed = (db: Database.Database): Promise<void> => {
  const feed = db.add(Feed.make({ name: 'counter-feed' }));
  return appendItems(db, feed, 0, INITIAL_ITEMS);
};

const CounterItemTile: FC<MosaicTileProps<CounterItem>> = ({ data, location, current }) => (
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

const VirtualStackFeedPaginationStory = () => {
  const { space } = useClientStory();
  const db = space?.db;
  const [feed] = useQuery(db, Filter.type(Feed.Feed));

  // Total items ever created by this story (the only writer to the feed), so the header can show a
  // "loaded of total" figure without loading the whole feed just to count it.
  const [total, setTotal] = useState(INITIAL_ITEMS);
  const [addCount, setAddCount] = useState(DEFAULT_ADD_COUNT);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  // Both branches select `CounterItem` so `items` infers as `CounterItem[]`; the fallback (no feed
  // yet) simply matches nothing until the query re-points once the feed loads.
  const query = useMemo(
    () =>
      feed
        ? Query.select(Filter.type(CounterItem)).from(feed).orderBy(Order.natural('desc')).limit(PAGE_SIZE)
        : Query.select(Filter.type(CounterItem)).limit(PAGE_SIZE),
    [feed],
  );
  const { items, getNext, getPrevious, hasMore, isLoading, atHead } = usePagination(db, query, {
    maxWindowSize: MAX_WINDOW_SIZE,
  });

  const pagination = useMemo(() => ({ getNext, getPrevious }), [getNext, getPrevious]);
  const { onChange } = useVirtualizerPagination({ items, getId: (item) => item.id, pagination });

  const handleAdd = useCallback(() => {
    if (!db || !feed || addCount <= 0) {
      return;
    }
    void appendItems(db, feed, total, addCount);
    setTotal((prev) => prev + addCount);
  }, [db, feed, total, addCount]);

  if (!db || !feed) {
    return <Loading data={{ db: !!db, feed: !!feed }} />;
  }

  const range = items.length > 0 ? `${items[0].index}–${items[items.length - 1].index}` : '–';

  return (
    <Mosaic.Root>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Input.Root>
              <Input.TextInput
                type='number'
                min={1}
                value={addCount}
                onChange={(event) => setAddCount(event.target.valueAsNumber || 0)}
                classNames='is-24'
              />
            </Input.Root>
            <Button onClick={handleAdd}>Add items</Button>
            <div className='flex grow justify-end items-center'>
              {range} · {items.length} loaded of {total}
              {!atHead && ' · detached'}
              {isLoading && ' · loading…'}
              {!hasMore && ' · end'}
            </div>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Mosaic.Container asChild eventHandler={{ id: 'virtual-stack-feed-pagination', canDrop: () => false }}>
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport ref={setViewport}>
                <Mosaic.VirtualStack
                  Tile={CounterItemTile}
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

const meta: Meta<typeof VirtualStackFeedPaginationStory> = {
  title: 'ui/react-ui-mosaic/Stack/FeedPagination',
  render: VirtualStackFeedPaginationStory,
  decorators: [
    withClientProvider({
      types: [Feed.Feed, CounterItem],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: ({ space }) => seedFeed(space.db),
    }),
    withLayout({ layout: 'column' }),
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * End-to-end pagination over a live ECHO feed: `usePagination` windows a feed seeded with 100
 * items, `useVirtualizerPagination` drives `Mosaic.VirtualStack`. Scroll down to page toward older
 * items (and past `MAX_WINDOW_SIZE` to see the window slide), scroll back up to recover them. Use
 * the toolbar to append more items to the feed; while at the head they appear live at the top.
 */
export const Default: Story = {};
