//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook, waitFor } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import * as Chat from '@dxos/assistant/Chat';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Message } from '@dxos/types';

import { type UseAiSessionProps, useAiSession } from './useAiSession.ts';

describe('useAiSession', () => {
  const TestLayer = TestDatabaseLayer({ types: [Chat.Chat, Feed.Feed, Message.Message] });

  // A session handed out for the wrong feed builds a chat model, and a thread, for the wrong conversation.
  test('never returns the previous chat session after the chat changes', async () => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const first = yield* Database.add(Feed.make());
      const second = yield* Database.add(Feed.make());
      const chats = [
        yield* Database.add(Chat.make({ feed: Ref.make(first) })),
        yield* Database.add(Chat.make({ feed: Ref.make(second) })),
      ];

      const returned: { feed: Feed.Feed; session: Feed.Feed | undefined }[] = [];
      const { result, rerender } = renderHook(
        (props: UseAiSessionProps & { feed: Feed.Feed }) => {
          const session = useAiSession(props);
          returned.push({ feed: props.feed, session: session?.feed });
          return session;
        },
        { initialProps: { db, chat: chats[0], feed: first } },
      );
      yield* Effect.promise(() => waitFor(() => expect(result.current?.feed).toBe(first)));

      rerender({ db, chat: chats[1], feed: second });
      yield* Effect.promise(() => waitFor(() => expect(result.current?.feed).toBe(second)));

      rerender({ db, chat: chats[0], feed: first });
      yield* Effect.promise(() => waitFor(() => expect(result.current?.feed).toBe(first)));

      // Every render saw either no session or the session of the feed it was rendered with.
      expect(returned.filter(({ feed, session }) => session !== undefined && session !== feed)).toEqual([]);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });
});
