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
});

export default Forex.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ from: rawFrom, to: rawTo }) {
      const from = rawFrom.toUpperCase();
      const to = rawTo.toUpperCase();
      const res = yield* Effect.promise(() => fetch(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`));
      const {
        data: { rates },
      } = yield* Effect.promise(() => res.json());

      return rates[to].toString();
    }),
  ),
);
