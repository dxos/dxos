//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Queue, Stream, TestClock, TestContext } from 'effect';

import { createStreamer } from './stream';

describe('stream', () => {
  it.effect('stream char-by-char', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello World!';
      const result = yield* testStreamer(text, 5);
      expect(result).toEqual(text.split(''));
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  it.effect('stream char-by-char with tags', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello <b>World</b>!';
      const result = yield* testStreamer(text, 5);
      expect(result).toEqual(['H', 'e', 'l', 'l', 'o', ' ', '<b>', 'W', 'o', 'r', 'l', 'd', '</b>', '!']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  it.effect('stream with nested tags', ({ expect }) =>
    Effect.gen(function* () {
      const text = '<div>Hello <span class="highlight">world</span>!</div>';
      const result = yield* testStreamer(text, 5);
      expect(result).toEqual([
        '<div>',
        'H',
        'e',
        'l',
        'l',
        'o',
        ' ',
        '<span class="highlight">',
        'w',
        'o',
        'r',
        'l',
        'd',
        '</span>',
        '!',
        '</div>',
      ]);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  it.effect('stream with self-closing tags', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello<br/>world<img src="test.jpg"/>';
      const result = yield* testStreamer(text, 5);
      expect(result).toEqual(['H', 'e', 'l', 'l', 'o', '<br/>', 'w', 'o', 'r', 'l', 'd', '<img src="test.jpg"/>']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  it.effect('stream with incomplete tag fragment', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello <div class="test';
      const result = yield* testStreamer(text, 5);
      expect(result).toEqual(['H', 'e', 'l', 'l', 'o', ' ', '<div class="test']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );
});

const testStreamer = (text: string, characterDelay: number) =>
  Effect.gen(function* () {
    const result: string[] = [];

    // Fork the stream processing.
    const queue = yield* Queue.unbounded<string>();
    const fiber = yield* Stream.fromQueue(queue).pipe(
      createStreamer(characterDelay),
      Stream.runForEach((text) => Effect.sync(() => result.push(text))),
      Effect.fork,
    );

    // Offer the string to the queue.
    yield* Queue.offer(queue, text);

    // Advance clock.
    yield* TestClock.adjust(text.length * characterDelay);

    // Shutdown the queue to signal completion.
    yield* Queue.shutdown(queue);

    // Wait for the fiber to complete.
    yield* fiber.await;

    return result;
  });
