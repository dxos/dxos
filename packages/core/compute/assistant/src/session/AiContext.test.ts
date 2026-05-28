//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';
import { describe, it } from 'vitest';

import { DXN, Feed, Obj, Ref, Type } from '@dxos/echo';

import * as AiContext from './AiContext';

const createMockFeedRuntime = (): Runtime.Runtime<Feed.FeedService> => {
  const mockFeedService: Context.Tag.Service<Feed.FeedService> = {
    append: async () => {},
    remove: async () => {},
    query: () =>
      ({
        subscribe: () => () => {},
        results: [],
        run: async () => [],
      }) as any,
    sync: async () => {},
    getSyncState: async () => ({ blocksToPull: 0, blocksToPush: 0, totalBlocks: 0 }),
  };
  const layer = Layer.succeed(Feed.FeedService, mockFeedService);
  return Effect.runSync(Effect.runtime<Feed.FeedService>().pipe(Effect.provide(layer)));
};

describe('AiContext.Binder', () => {
  it('should handle bind with Ref', async () => {
    const feed = Feed.make();
    const runtime = createMockFeedRuntime();
    const binder = new AiContext.Binder({ feed, runtime });

    const TestSchema = Schema.Struct({}).pipe(Type.makeObject(DXN.make('org.dxos.type.example', '0.1.0')));

    const obj = Obj.make(TestSchema, {});
    const ref = Ref.make(obj);

    await binder.bind({
      blueprints: [],
      objects: [ref],
    });
  });
});
