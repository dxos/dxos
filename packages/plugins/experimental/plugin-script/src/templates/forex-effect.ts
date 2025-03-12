//
// Copyright 2025 DXOS.org
//

/* @version
{
  "effect": "3.13.3",
  "@effect/platform": "0.77.2",
  "@dxos/echo-schema": "0.7.5-main.b19bfc8",
  "@dxos/functions": "0.7.5-main.b19bfc8"
}
*/

import { HttpClient, HttpClientRequest, FetchHttpClient } from '@effect/platform';
import { Effect, Schedule } from 'effect';

import { S } from '@dxos/echo-schema';
import { defineFunction } from '@dxos/functions';

const RatesSchema = S.Struct({
  data: S.Struct({
    rates: S.Record({ key: S.String, value: S.Number }),
  }),
});

export default defineFunction({
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: S.Struct({
    from: S.String.annotations({ description: 'The source currency' }),
    to: S.String.annotations({ description: 'The target currency' }),
  }),

  outputSchema: S.String.annotations({ description: 'The exchange rate between the two currencies' }),

  handler: ({
    event: {
      data: { from, to },
    },
  }) =>
    Effect.gen(function* () {
      const res = yield* HttpClientRequest.get(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`).pipe(
        HttpClient.execute,
        Effect.flatMap((res) => res.json),
        Effect.flatMap(S.decodeUnknown(RatesSchema)),
        Effect.timeout('1 second'),
        Effect.retry(Schedule.exponential(1000).pipe(Schedule.compose(Schedule.recurs(3)))),
        Effect.scoped,
      );
      return res.data.rates[to].toString();
    }).pipe(Effect.provide(FetchHttpClient.layer)),
});
