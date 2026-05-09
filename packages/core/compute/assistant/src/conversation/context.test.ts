//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';
import { describe, it } from 'vitest';

import { Feed, Obj, Ref, Type } from '@dxos/echo';

import { AiContextBinder } from './context';

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
  };
  const layer = Layer.succeed(Feed.FeedService, mockFeedService);
  return Effect.runSync(Effect.runtime<Feed.FeedService>().pipe(Effect.provide(layer)));
};

describe('AiContextBinder', () => {
  it('should handle bind with Ref', async () => {
    const feed = Feed.make();
    const runtime = createMockFeedRuntime();
    const binder = new AiContextBinder({ feed, runtime });

    const TestSchema = Schema.Struct({}).pipe(
      Type.object({
        typename: 'org.dxos.type.example',
        version: '0.1.0',
      }),
    );

    const obj = Obj.make(TestSchema, {});
    const ref = Ref.make(obj);

    await binder.bind({
      blueprints: [],
      objects: [ref],
    });
  });
});
