//
// Copyright 2023 DXOS.org
//

import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { test } from '@dxos/test';

import { trace } from './api';
import { TRACE_PROCESSOR } from './trace-processor';

@trace.resource()
class FeedStore {
  private readonly _storage: any;

  private readonly _feeds = new Map<string, Feed>();

  @trace.info()
  get dataStore() {
    return this._storage.type;
  }

  @trace.span()
  async openFeed(ctx: Context) {
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
  async open(ctx: Context) {}

  @trace.span()
  async close() {
    throw new Error('Not implemented');
  }
}

test('feed store tracing', async () => {
  const store = new FeedStore();
  await store.openFeed(new Context());
  const feed = await store.openFeed(new Context());

  await feed.close().catch(() => {});

  log.info('resources', TRACE_PROCESSOR.resources);
  log.info('spans', TRACE_PROCESSOR.spans);
});
