//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { runAndForwardErrors } from './errors';

describe('sanity tests', () => {
  test('function pipeline', async ({ expect }) => {
    const result = Function.pipe(
      10,
      (value) => value + 3,
      (value) => value * 2,
    );
    expect(result).to.eq(26);
  });

  test('effect pipeline (mixing types)', async ({ expect }) => {
    const result = await runAndForwardErrors(
      Function.pipe(
        Effect.promise(() => Promise.resolve(100)),
        Effect.tap((value) => {
          log('tap', { value });
        }),
        Effect.map((value: number) => String(value)),
        Effect.tap((value) => {
          log('tap', { value });
        }),
        Effect.map((value: string) => value.length),
        Effect.tap((value) => {
          log('tap', { value });
        }),
      ),
    );
    expect(result).to.eq(3);
  });

  test('effect pipeline (mixing sync/async)', async ({ expect }) => {
    const result = await runAndForwardErrors(
      Function.pipe(
        Effect.succeed(100),
        Effect.tap((value) => {
          log('tap', { value });
        }),
        Effect.flatMap((value) => Effect.promise(() => Promise.resolve(String(value)))),
        Effect.tap((value) => {
          log('tap', { value });
        }),
        Effect.map((value) => value.length),
        Effect.tap((value) => {
          log('tap', { value });
        }),
      ),
    );
    expect(result).to.eq(3);
  });

  test('error handling', async ({ expect }) => {
    runAndForwardErrors(
      Function.pipe(
        Effect.succeed(10),
        Effect.map((value) => value * 2),
        Effect.flatMap((value) =>
          Effect.promise(() => {
            if (value > 10) {
              return Promise.reject(new Error('error message'));
            }

            return Promise.resolve(value);
          }),
        ),
      ),
    )
      .then(() => expect.fail())
      .catch((error: any) => {
        expect(error).to.be.instanceOf(Error);
      });
  });
});
