//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Fiber, Queue, Stream } from 'effect';

import { streamDelay } from './stream-delay';

describe('stream', () => {
  it.effect(
    'should stream text',
    Effect.fnUntraced(function* ({ expect }) {
      const results: string[] = [];

      // Then create and run the stream
      const queue = Effect.runSync(Queue.unbounded<string>());
      const fiber = yield* Effect.fork(
        Stream.fromQueue(queue).pipe(
          Stream.take(3), // Take exactly 2 items
          streamDelay({ delay: '5 millis' }),
          Stream.runForEach((text) =>
            Effect.sync(() => {
              console.log('consumer', text);
              results.push(text);
            }),
          ),
        ),
      );

      // Add items to queue first
      void Effect.runPromise(Queue.offer(queue, '1'));
      void Effect.runPromise(Queue.offer(queue, '2'));
      void Effect.runPromise(Queue.offer(queue, '3'));

      // Wait for consumer to finish processing
      yield* Fiber.join(fiber);

      // Verify results
      expect(results.join('')).toBe('123');
    }),
  );
});
