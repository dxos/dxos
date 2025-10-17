//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

describe('effect-basics', () => {
  describe('streams', () => {
    test('stream', async ({ expect }) => {
      const stream = Stream.range(1, 10);
      const sum = stream.pipe(Stream.runFold(0, (acc, x) => acc + x));
      await expect(Effect.runPromise(sum)).resolves.toBe(55);
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
