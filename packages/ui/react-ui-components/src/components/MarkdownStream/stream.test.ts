//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Queue, Stream, TestContext } from 'effect';

import { createStreamer, splitFragments, splitSentences, splitSpans } from './stream';

describe('stream', () => {
  it.effect('tokenize tags', ({ expect }) =>
    Effect.gen(function* () {
      {
        expect(splitSpans('A\n<test />\nB')).toEqual(['A\n', '<test />', '\nB']);
        expect(splitSpans('A\n<test>hello</test>\nB')).toEqual(['A\n', '<test>', 'hello', '</test>', '\nB']);
      }
    }),
  );

  it.effect('tokenize fragments', ({ expect }) =>
    Effect.gen(function* () {
      {
        expect(splitFragments('A\n<toolkit />\nB')).toEqual(['A\n', '<toolkit />', '\nB']);
        expect(splitFragments('A\n<suggestion>Test</suggestion>\nB')).toEqual([
          'A\n',
          '<suggestion>Test</suggestion>',
          '\nB',
        ]);
        expect(splitFragments('A\n<select><option /><option>Test</option></select>\nB')).toEqual([
          'A\n',
          '<select><option /><option>Test</option></select>',
          '\nB',
        ]);
      }
    }),
  );

  it.effect('split sentences', ({ expect }) =>
    Effect.gen(function* () {
      expect(splitSentences('Hello world. What a nice day!\nLooking great.')).toEqual([
        'Hello world. ',
        'What a nice day!\n',
        'Looking great.',
      ]);
    }),
  );

  it.effect('stream char-by-char with tags', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello <b>World</b>!';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Hello ', '<b>World</b>', '!']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  it.effect('stream with self-closing tags', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello<br/>world<img src="test.jpg"/>';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Hello', '<br/>', 'world', '<img src="test.jpg"/>']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  it.effect('stream with incomplete tag fragment', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello <div class="test';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Hello ', '<div class="test']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );
});

const testStreamer = (text: string) =>
  Effect.gen(function* () {
    const result: string[] = [];

    // Fork the stream processing.
    const queue = yield* Queue.unbounded<string>();
    const fiber = yield* Stream.fromQueue(queue).pipe(
      createStreamer,
      Stream.runForEach((text) => Effect.sync(() => result.push(text))),
      Effect.fork,
    );

    // Offer the string to the queue.
    yield* Queue.offer(queue, text);

    // Shutdown the queue to signal completion.
    yield* Queue.shutdown(queue);

    // Wait for the fiber to complete.
    yield* fiber.await;

    return result;
  });
