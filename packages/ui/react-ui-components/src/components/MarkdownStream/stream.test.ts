//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Queue, Stream, TestClock, TestContext } from 'effect';

import { createStreamer, chunkWithXmlFragments, tokenizeWithTags } from './stream';

describe('stream', () => {
  it.effect('tokenize tags', ({ expect }) =>
    Effect.gen(function* () {
      {
        expect(tokenizeWithTags('A\n<test />\nB')).toEqual(['A', '\n', '<test />', '\n', 'B']);
        expect(tokenizeWithTags('A\n<test>hello</test>\nB')).toEqual([
          'A',
          '\n',
          '<test>',
          'h',
          'e',
          'l',
          'l',
          'o',
          '</test>',
          '\n',
          'B',
        ]);
      }
    }),
  );

  it.effect('tokenize fragments', ({ expect }) =>
    Effect.gen(function* () {
      {
        expect(chunkWithXmlFragments('A\n<toolkit />\nB')).toEqual(['A', '\n', '<toolkit />', '\n', 'B']);
        expect(chunkWithXmlFragments('A\n<suggestion>Test</suggestion>\nB')).toEqual([
          'A',
          '\n',
          '<suggestion>Test</suggestion>',
          '\n',
          'B',
        ]);
        expect(chunkWithXmlFragments('A\n<select><option /><option>Test</option></select>\nB')).toEqual([
          'A',
          '\n',
          '<select><option /><option>Test</option></select>',
          '\n',
          'B',
        ]);
      }
    }),
  );

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
      expect(result).toEqual(['H', 'e', 'l', 'l', 'o', ' ', '<b>World</b>', '!']);
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
