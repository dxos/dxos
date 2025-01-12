//
// Copyright 2025 DXOS.org
//

import { Effect, Stream } from 'effect';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { isStream } from './schema-dsl';

describe('effect-basics', () => {
  describe('streams', () => {
    test('should work', async ({ expect }) => {
      const stream = Stream.range(1, 10);

      const sum = stream.pipe(Stream.runFold(0, (acc, x) => acc + x));

      await expect(Effect.runPromise(sum)).resolves.toBe(55);
    });

    test('stream instanceof checks', ({ expect }) => {
      expect(isStream(Stream.range(1, 10))).toBe(true);
      expect(isStream(Effect.succeed(1))).toBe(false);
      expect(isStream({})).toBe(false);
      expect(isStream(1)).toBe(false);
      expect(isStream('')).toBe(false);
      expect(isStream(null)).toBe(false);
      expect(isStream(undefined)).toBe(false);
      expect(isStream(true)).toBe(false);
      expect(isStream(false)).toBe(false);
      expect(isStream(new ReadableStream())).toBe(false);
    });

    test('stream is not an effect', ({ expect }) => {
      expect(Effect.isEffect(Stream.range(1, 10))).toBe(false);
    });
  });

  test('caching', async () => {
    const compute = Effect.promise(async () => {
      log.info('compute');
      return 1;
    });

    // const result = Effect.gen(function* () {
    //   const cached = yield* compute.pipe(Effect.cached);
    //   const value = yield* cached;
    //   return value;
    // });

    await Effect.runPromise(compute);
    await Effect.runPromise(compute);
  });
});
