//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

const Forex = Operation.make({
  meta: {
    key: 'org.dxos.script.forex',
    name: 'Forex',
    description: 'Returns the exchange rate between two currencies.',
  },
  input: Schema.Struct({
    from: Schema.String.annotations({ description: 'The source currency' }),
    to: Schema.String.annotations({ description: 'The target currency' }),
  }),
  output: Schema.Any,
  handler: async ({ data: { from: rawFrom, to: rawTo } }) => {
    const from = rawFrom.toUpperCase();
    const to = rawTo.toUpperCase();
    const res = yield * Effect.promise(() => fetch(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`));
    if (!res.ok) {
      throw new Error(`Rates API returned ${res.status}: ${res.statusText}`);
    }

    const json = yield * Effect.promise(() => res.json());
    const rate = json?.data?.rates?.[to];
    if (rate == null) {
      throw new Error(`No rate found for ${from} -> ${to}`);
    }

    return rate.toString();
  },
});

export default Forex.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ from, to }) {
      const res = yield* Effect.promise(() => fetch(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`));
      const {
        data: { rates },
      } = yield* Effect.promise(() => res.json());

      return rates[to].toString();
    }),
  ),
);
