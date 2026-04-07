//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AiConversation } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Database, Feed } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';

import { AiChatProcessor } from './processor';

describe('Chat processor', () => {
  it.scoped(
    'basic',
    Effect.fn(
      function* ({ expect }) {
        const feed = Feed.make();
        yield* Database.add(feed);
        const feedRuntime = yield* Effect.runtime<Feed.FeedService>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed, feedRuntime }));
        const managedRuntime = ManagedRuntime.make(
          Effect.runSync(Effect.map(Effect.context<never>(), () => undefined as any)) as any,
        );
        const processor = new AiChatProcessor(conversation, managedRuntime as any, feed);
        expect(processor).toBeDefined();
        expect(processor.active).toBeDefined();
      },
      Effect.provide(AssistantTestLayer({ tracing: 'noop' })),
      TestHelpers.provideTestContext,
    ),
  );
});
