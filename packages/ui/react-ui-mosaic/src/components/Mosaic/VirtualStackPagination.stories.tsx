//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { type FC, useCallback, useMemo, useRef, useState } from 'react';

import { Database, DXN, Feed, Filter, Obj, Order, Query, Type } from '@dxos/echo';
import { random } from '@dxos/random';
import { type Client, Config, useClient } from '@dxos/react-client';
import { usePagination, useQuery, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Button, Card, Input, Panel, ScrollArea, Select, Toolbar } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { useVirtualizerPagination } from '../../hooks';
import { Focus } from '../Focus';
import { Mosaic } from './Mosaic';
import { type MosaicTileProps } from './Tile';

const PAGE_SIZE = 50;
const MAX_WINDOW_SIZE = PAGE_SIZE * 10;

//
// In-memory story (no ECHO): windows a plain array to show `useVirtualizerPagination` needs only a
// `{ items, getNext, getPrevious }` shape.
//

/** Total size of the synthetic, in-memory data source. */
const TOTAL_ITEMS = 5_000;

type ListItem = { id: string; index: number };

type Range = { skip: number; limit: number };

/**
 * Windows a plain in-memory array the same way `usePagination` windows a live query: a page
 * size, a bounded max window, and getNext/getPrevious that grow the window until it hits
 * `MAX_WINDOW_SIZE`, then slide it instead.
 */
const usePaginatedItems = (total: number) => {
  const [range, setRange] = useState<Range>({ skip: 0, limit: PAGE_SIZE });
  const pendingRef = useRef(false);

  const items = useMemo<ListItem[]>(() => {
    const count = Math.max(0, Math.min(range.limit, total - range.skip));
    return Array.from({ length: count }, (_, i) => {
      const index = range.skip + i;
      return { id: String(index), index };
    });
  }, [range, total]);

  const getNext = useCallback(() => {
    if (pendingRef.current) {
      return;
    }
    pendingRef.current = true;
    queueMicrotask(() => {
      pendingRef.current = false;
    });
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

  const getPrevious = useCallback(() => {
    if (pendingRef.current) {
      return;
    }
    pendingRef.current = true;
    queueMicrotask(() => {
      pendingRef.current = false;
    });
    setRange((prev) => (prev.skip === 0 ? prev : { ...prev, skip: Math.max(0, prev.skip - PAGE_SIZE) }));
  }, []);

  return { items, getNext, getPrevious, atHead: range.skip === 0 };
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
  const { items, getNext, getPrevious, atHead } = usePaginatedItems(TOTAL_ITEMS);
  const pagination = useMemo(() => ({ getNext, getPrevious, atHead }), [getNext, getPrevious, atHead]);
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

//
// Feed-backed story (live ECHO): end-to-end pagination over a feed, with runtime append and sort.
//

/** Items seeded into the feed on space creation. */
const INITIAL_ITEMS = 100;
/** Default value of the toolbar's "add" count input. */
const DEFAULT_ADD_COUNT = 50;

class CounterItem extends Type.makeObject<CounterItem>(DXN.make('com.example.type.counterItem', '0.1.0'))(
  Schema.Struct({
    index: Schema.Number,
    word: Schema.String,
  }),
) {}

/**
 * Persistent, monotonically-advancing index used to number new items. Lives in the space db (not
 * the feed) so item numbering continues correctly across reloads rather than restarting.
 */
class Counter extends Type.makeObject<Counter>(DXN.make('com.example.type.paginationCounter', '0.1.0'))(
  Schema.Struct({
    next: Schema.Number,
  }),
) {}

type SortField = 'natural' | 'number' | 'word';
type SortDirection = 'asc' | 'desc';

const makeItems = (start: number, count: number): CounterItem[] =>
  Array.from({ length: count }, (_, i) => Obj.make(CounterItem, { index: start + i, word: random.lorem.word() }));

const appendItems = (db: Database.Database, feed: Feed.Feed, start: number, count: number): Promise<void> =>
  Feed.append(feed, makeItems(start, count)).pipe(Effect.provide(Database.layer(db)), Effect.runPromise);

const seedFeed = async (db: Database.Database): Promise<void> => {
  db.add(Obj.make(Counter, { next: INITIAL_ITEMS }));
  const feed = db.add(Feed.make({ name: 'counter-feed' }));
  await appendItems(db, feed, 0, INITIAL_ITEMS);
};

/**
 * Reuses the persisted identity/space/feed, creating and seeding them only on the first ever load.
 * Runs after `client.initialize()`, by which point `client.spaces.get()` already reflects any
 * persisted spaces (the space list awaits its initial update on open), so an existing space is
 * reused rather than duplicated on reload.
 */
const initializeStory = async (client: Client): Promise<void> => {
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }
  const space = client.spaces.get()[0] ?? (await client.spaces.create());
  await space.waitUntilReady();
  const feeds = await space.db.query(Filter.type(Feed.Feed)).run();
  if (feeds.length === 0) {
    await seedFeed(space.db);
  } else {
    // Feed exists but its `Counter` is missing (partial seed / older data): restore it from the
    // feed's current length so numbering continues and the story isn't stuck without a counter.
    const counters = await space.db.query(Filter.type(Counter)).run();
    if (counters.length === 0) {
      const existing = await space.db.query(Query.select(Filter.type(CounterItem)).from(feeds[0])).run();
      space.db.add(Obj.make(Counter, { next: existing.length }));
    }
  }
  // Flush so the `Counter` (a space-db object) is indexed and persisted; otherwise it survives in
  // Automerge but the index-backed `useQuery(Filter.type(Counter))` can't find it after reload.
  await space.db.flush({ indexes: true });
};

const orderFor = (field: SortField, direction: SortDirection) => {
  switch (field) {
    case 'number':
      return Order.property<CounterItem>('index', direction);
    case 'word':
      return Order.property<CounterItem>('word', direction);
    case 'natural':
    default:
      return Order.natural(direction);
  }
};

const CounterItemTile: FC<MosaicTileProps<CounterItem>> = ({ data, location, current }) => (
  <Mosaic.Tile id={data.id} data={data} location={location} current={current} asChild>
    <Focus.Item asChild>
      <Card.Root>
        <Card.Header>
          <Card.Title>
            #{data.index} · {data.word}
          </Card.Title>
        </Card.Header>
      </Card.Root>
    </Focus.Item>
  </Mosaic.Tile>
);

const FeedPaginationStory = () => {
  const client = useClient();
  const [space] = useSpaces();
  const db = space?.db;
  const [feed] = useQuery(db, Filter.type(Feed.Feed));
  // Persisted item count / next index (the story is the feed's only writer), so the header shows a
  // "loaded of total" figure and item numbering continues across reloads without a full-feed count.
  const [counter] = useQuery(db, Filter.type(Counter));

  const [addCount, setAddCount] = useState(DEFAULT_ADD_COUNT);
  const [sortField, setSortField] = useState<SortField>('natural');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  // Both branches select `CounterItem` so `items` infers as `CounterItem[]`; the fallback (no feed
  // yet) matches nothing until the query re-points once the feed loads. Re-pointing on a sort
  // change resets to the first page.
  const query = useMemo(
    () =>
      feed
        ? Query.select(Filter.type(CounterItem)).from(feed).orderBy(orderFor(sortField, direction)).limit(PAGE_SIZE)
        : Query.select(Filter.type(CounterItem)).limit(PAGE_SIZE),
    [feed, sortField, direction],
  );
  const { items, getNext, getPrevious, hasMore, isLoading, atHead } = usePagination(db, query, {
    maxWindowSize: MAX_WINDOW_SIZE,
  });

  const pagination = useMemo(() => ({ getNext, getPrevious, atHead }), [getNext, getPrevious, atHead]);
  const { onChange } = useVirtualizerPagination({ items, getId: (item) => item.id, pagination });

  const handleAdd = useCallback(() => {
    if (!db || !feed || !counter || addCount <= 0) {
      return;
    }
    void appendItems(db, feed, counter.next, addCount);
    Obj.update(counter, (counter) => {
      counter.next += addCount;
    });
  }, [db, feed, counter, addCount]);

  // Wipes the persisted identity/storage and reloads so the story boots a fresh seeded space.
  const handleReset = useCallback(() => {
    void client.reset().then(() => window.location.reload());
  }, [client]);

  if (!db || !feed || !counter) {
    return <Loading data={{ db: !!db, feed: !!feed, counter: !!counter }} />;
  }

  const total = counter.next;

  return (
    <Mosaic.Root>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <div className='shrink-0' style={{ inlineSize: '6rem' }}>
              <Input.Root>
                <Input.TextInput
                  type='number'
                  min={1}
                  value={addCount}
                  onChange={(event) => setAddCount(event.target.valueAsNumber || 0)}
                  classNames='is-full'
                />
              </Input.Root>
            </div>
            <Button onClick={handleAdd} classNames='shrink-0'>
              Add
            </Button>
            <Button onClick={handleReset} classNames='shrink-0'>
              Reset
            </Button>
            <Select.Root
              value={sortField}
              onValueChange={(value) => setSortField(value === 'number' || value === 'word' ? value : 'natural')}
            >
              <Toolbar.Button asChild>
                <Select.TriggerButton classNames='shrink-0' />
              </Toolbar.Button>
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    <Select.Option value='natural'>Natural</Select.Option>
                    <Select.Option value='number'>Number</Select.Option>
                    <Select.Option value='word'>Word</Select.Option>
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <Select.Root value={direction} onValueChange={(value) => setDirection(value === 'asc' ? 'asc' : 'desc')}>
              <Toolbar.Button asChild>
                <Select.TriggerButton classNames='shrink-0' />
              </Toolbar.Button>
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    <Select.Option value='asc'>Ascending</Select.Option>
                    <Select.Option value='desc'>Descending</Select.Option>
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <div className='grow text-end truncate whitespace-nowrap'>
              {items.length} loaded of {total}
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

const meta: Meta = {
  title: 'ui/react-ui-mosaic/Stack/Pagination',
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

/**
 * `Mosaic.VirtualStack` paginated by `useVirtualizerPagination` over a plain in-memory array --
 * no ECHO query or `usePagination` involved. Scroll down to grow the window, then keep
 * scrolling past `MAX_WINDOW_SIZE` to see it slide (evicting the newest items); scroll back up to
 * slide it back toward the head without a visible jump.
 */
export const Default: Story = {
  render: VirtualStackPaginationStory,
};

/**
 * End-to-end pagination over a live ECHO feed: `usePagination` windows a feed seeded with 100
 * items (each a number + a random word), rendered through `useVirtualizerPagination` +
 * `Mosaic.VirtualStack`. Scroll to page toward older items (past `MAX_WINDOW_SIZE` to see the
 * window slide). Use the toolbar to append more items (they appear live at the head), and to sort
 * by natural/number/word in either direction.
 */
export const FeedBacked: Story = {
  render: FeedPaginationStory,
  decorators: [
    withClientProvider({
      // Persist identity/storage across reloads (OPFS-backed), mirroring stories-assistant. The
      // worker URL points at a local re-export since a direct `@dxos/client/opfs-worker` worker URL
      // doesn't resolve under Storybook's bundler. `onInitialized` reuses the persisted space/feed
      // rather than creating fresh ones each load (hence no `createIdentity`/`createSpace` flags).
      config: new Config({ runtime: { client: { storage: { persistent: true } } } }),
      createOpfsWorker: () => new Worker(new URL('./opfs-worker', import.meta.url), { type: 'module' }),
      types: [Feed.Feed, CounterItem, Counter],
      onInitialized: initializeStory,
    }),
  ],
};
