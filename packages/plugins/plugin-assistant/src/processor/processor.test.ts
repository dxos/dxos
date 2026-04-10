//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AiConversation } from '@dxos/assistant';
import { Chat } from '@dxos/assistant-toolkit';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
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
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed, runtime }));
        const managedRuntime = ManagedRuntime.make(
          Effect.runSync(Effect.map(Effect.context<never>(), () => undefined as any)) as any,
        );
        const processor = new AiChatProcessor(conversation, managedRuntime as any, feed);
        expect(processor).toBeDefined();
        expect(processor.active).toBeDefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  describe('auto-update chat name', () => {
    it.scoped(
      'creates processor with chat and autoUpdateNameChance option',
      Effect.fn(
        function* ({ expect }) {
          const feed = Feed.make();
          yield* Database.add(feed);

          const chat = Obj.make(Chat.Chat, { feed: Ref.make(feed) });
          yield* Database.add(chat);
          yield* Database.flush();

          const feedRuntime = yield* Effect.runtime<Feed.FeedService>();
          const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed, runtime: feedRuntime }));

          const managedRuntime = ManagedRuntime.make(
            Effect.runSync(Effect.map(Effect.context<never>(), () => undefined as any)) as any,
          );

          const processor = new AiChatProcessor(conversation, managedRuntime as any, feed, {
            chat: Ref.make(chat),
            autoUpdateNameChance: 1.0,
          });

          expect(processor).toBeDefined();
          expect(chat.name).toBeUndefined();
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );

    it.scoped(
      'creates processor with named chat and zero chance',
      Effect.fn(
        function* ({ expect }) {
          const feed = Feed.make();
          yield* Database.add(feed);

          const chat = Obj.make(Chat.Chat, { name: 'Existing Chat', feed: Ref.make(feed) });
          yield* Database.add(chat);
          yield* Database.flush();

          const feedRuntime = yield* Effect.runtime<Feed.FeedService>();
          const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed, runtime: feedRuntime }));

          const managedRuntime = ManagedRuntime.make(
            Effect.runSync(Effect.map(Effect.context<never>(), () => undefined as any)) as any,
          );

          const processor = new AiChatProcessor(conversation, managedRuntime as any, feed, {
            chat: Ref.make(chat),
            autoUpdateNameChance: 0,
          });

          expect(processor).toBeDefined();
          expect(chat.name).toBe('Existing Chat');
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );

    it.scoped(
      'uses default autoUpdateNameChance of 0.1',
      Effect.fn(
        function* ({ expect }) {
          const feed = Feed.make();
          yield* Database.add(feed);

          const chat = Obj.make(Chat.Chat, { feed: Ref.make(feed) });
          yield* Database.add(chat);
          yield* Database.flush();

          const feedRuntime = yield* Effect.runtime<Feed.FeedService>();
          const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed, runtime: feedRuntime }));

          const managedRuntime = ManagedRuntime.make(
            Effect.runSync(Effect.map(Effect.context<never>(), () => undefined as any)) as any,
          );

          const processor = new AiChatProcessor(conversation, managedRuntime as any, feed, {
            chat: Ref.make(chat),
          });

          expect(processor).toBeDefined();
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );
  });
});
