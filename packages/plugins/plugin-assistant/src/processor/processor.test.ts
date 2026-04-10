//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { test, expect } from 'vitest';

import { AiConversation } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Database, Feed } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';

import { AiChatProcessor, shouldUpdateChatName } from './processor';

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
      Effect.provide(AssistantTestLayer({ tracing: 'noop' })),
      TestHelpers.provideTestContext,
    ),
  );
});

describe('shouldUpdateChatName', () => {
  test('returns true when chat has no name', () => {
    expect(shouldUpdateChatName(undefined, 0.1, () => 0.99)).toBe(true);
    expect(shouldUpdateChatName('', 0.1, () => 0.99)).toBe(true);
  });

  test('returns true when random chance triggers', () => {
    expect(shouldUpdateChatName('Existing Chat', 0.5, () => 0.3)).toBe(true);
    expect(shouldUpdateChatName('Existing Chat', 0.1, () => 0.05)).toBe(true);
  });

  test('returns false when chat has name and random chance does not trigger', () => {
    expect(shouldUpdateChatName('Existing Chat', 0.1, () => 0.5)).toBe(false);
    expect(shouldUpdateChatName('Existing Chat', 0.1, () => 0.1)).toBe(false);
    expect(shouldUpdateChatName('Existing Chat', 0.1, () => 0.99)).toBe(false);
  });

  test('uses default random function when not provided', () => {
    const results: boolean[] = [];
    for (let i = 0; i < 100; i++) {
      results.push(shouldUpdateChatName('Existing Chat', 0.5));
    }
    const trueCount = results.filter((r) => r).length;
    expect(trueCount).toBeGreaterThan(20);
    expect(trueCount).toBeLessThan(80);
  });

  test('always returns true when chance is 1.0 and chat has name', () => {
    expect(shouldUpdateChatName('Existing Chat', 1.0, () => 0.99)).toBe(true);
  });

  test('never returns true based on chance when chance is 0 and chat has name', () => {
    expect(shouldUpdateChatName('Existing Chat', 0, () => 0.0)).toBe(false);
  });
});
