//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';

export const TICKER_PROCESS_KEY = 'org.dxos.stories.compute.ticker';

/** Delay between computation steps. */
const TICK_INTERVAL = 1_000;

export const TickerOutput = Schema.Struct({
  /** Number of computation steps completed. */
  tick: Schema.Number,
  /** Largest prime found so far. */
  prime: Schema.Number,
});

export type TickerOutput = Schema.Schema.Type<typeof TickerOutput>;

const isPrime = (value: number): boolean => {
  if (value < 2) {
    return false;
  }
  for (let divisor = 2; divisor * divisor <= value; divisor++) {
    if (value % divisor === 0) {
      return false;
    }
  }
  return true;
};

const nextPrime = (after: number): number => {
  let candidate = after + 1;
  while (!isPrime(candidate)) {
    candidate++;
  }
  return candidate;
};

/**
 * Long-running computation that finds successive primes, one per alarm, until it is terminated.
 * The alarm loop leaves the process HYBERNATING between steps rather than blocking its runtime.
 */
export const TickerProcess = Operation.makeDurable(
  { key: TICKER_PROCESS_KEY, input: Schema.Void, output: TickerOutput, services: [] },
  (ctx) =>
    Effect.sync(() => {
      let tick = 0;
      let prime = 1;
      return {
        onSpawn: () => ctx.setAlarm(TICK_INTERVAL),
        onAlarm: () =>
          Effect.gen(function* () {
            tick++;
            prime = nextPrime(prime);
            ctx.submitOutput({ tick, prime });
            yield* ctx.setAlarm(TICK_INTERVAL);
          }),
      };
    }),
);
