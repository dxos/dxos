//
// Copyright 2025 DXOS.org
//

import { defineFunction } from '@dxos/functions';
import { FetchHttpClient, HttpClient, HttpClientRequest } from '@effect/platform';
import { Effect, Schedule, Schema } from 'effect';

export default defineFunction({
  key: 'dxos.org/script/forex-effect',
  name: 'Forex Effect',
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: Schema.Struct({
    from: Schema.String.annotations({ description: 'The source currency' }),
    to: Schema.String.annotations({ description: 'The target currency' }),
  }),

  outputSchema: Schema.String.annotations({ description: 'The exchange rate between the two currencies' }),

  handler: async ({ data: { from, to } }: any) =>
    Effect.gen(function* () {
      const res = yield* HttpClientRequest.get(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`).pipe(
        HttpClient.execute,
        Effect.flatMap((res: any) => res.json),
        Effect.timeout('1 second'),
        Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
        Effect.scoped,
      );

      return (res as any).data.rates[to].toString();
    }).pipe(Effect.provide(FetchHttpClient.layer)),
});
