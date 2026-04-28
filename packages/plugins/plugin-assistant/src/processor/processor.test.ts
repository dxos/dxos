//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AiSession } from '@dxos/assistant';
import { Chat } from '@dxos/assistant-toolkit';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { Database, Feed } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';

import { AiChatProcessor } from './processor';

const TestLayer = AssistantTestLayer({ tracing: 'noop', types: [Chat.Chat, Feed.Feed] });

describe('Chat processor', () => {
  it.scoped(
    'basic',
    Effect.fn(
      function* ({ expect }) {
        const feed = Feed.make();
        yield* Database.add(feed);
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        const session = yield* acquireReleaseResource(() => new AiSession({ feed, runtime }));
        const managedRuntime = ManagedRuntime.make(
          Effect.runSync(Effect.map(Effect.context<never>(), () => undefined as any)) as any,
        );
        const processor = new AiChatProcessor(session, managedRuntime as any, feed);
        expect(processor).toBeDefined();
        expect(processor.active).toBeDefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
