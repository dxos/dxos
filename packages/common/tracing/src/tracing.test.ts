//
// Copyright 2023 DXOS.org
//

import { beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { log } from '@dxos/log';

import { trace } from './api';
import { TRACE_PROCESSOR } from './trace-processor';

const FeedStoreResource = Symbol.for('FeedStore');

@trace.resource({ annotation: FeedStoreResource })
class FeedStore {
  private readonly _storage: any;

  private readonly _feeds = new Map<string, Feed>();

  @trace.info()
  get dataStore() {
    return this._storage.type;
  }

  @trace.span()
  async openFeed(ctx: Context): Promise<Feed> {
    const feed = new Feed();
    feed.key = Math.random().toString(36).substring(2, 15);
    this._feeds.set(feed.key, feed);
    trace.addLink(this, feed, {});

    await feed.open(ctx);
    return feed;
  }
}

@trace.resource()
class Feed {
  @trace.info()
  key!: string;

  @trace.span()
  async open(ctx: Context): Promise<void> {}

  @trace.span()
  async close(): Promise<void> {
    throw new Error('Not implemented');
  }
}

describe('tracing', () => {
  beforeEach(() => {
    TRACE_PROCESSOR.resources.clear();
  });

  test('feed store tracing', async () => {
    const store = new FeedStore();
    const feed1 = await store.openFeed(new Context());
    const feed2 = await store.openFeed(new Context());

    await feed2.close().catch(() => {});

    expect([...TRACE_PROCESSOR.resources.values()].map((r) => r.instance.deref())).to.deep.eq([store, feed1, feed2]);
    log.info('spans', { spans: TRACE_PROCESSOR.spans });
  });

  test('findByAnnotation', async () => {
    const store = new FeedStore();
    expect(TRACE_PROCESSOR.findResourcesByAnnotation(FeedStoreResource)[0].instance.deref()).to.eq(store);
  });
});
