//
// Copyright 2025 DXOS.org
//

// @version 0.77.2?deps=effect@3.13.3
import { HttpClient, HttpClientRequest, FetchHttpClient } from '@effect/platform';
// TODO(wittjosiah): Use @dxos packages from npm.
// @ts-ignore
import { defineFunction, S } from 'dxos:functions';
// @version 3.13.3
import { Effect, Schedule } from 'effect';

export default defineFunction({
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: S.Struct({
    from: S.String.annotations({ description: 'The source currency' }),
    to: S.String.annotations({ description: 'The target currency' }),
  }),

  outputSchema: S.String.annotations({ description: 'The exchange rate between the two currencies' }),

  handler: async ({
    event: {
      data: { from, to },
    },
  }: any) =>
    Effect.gen(function* () {
      const res = yield* HttpClientRequest.get(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`).pipe(
        HttpClient.execute,
        Effect.flatMap((res: any) => res.json),
        Effect.timeout('1 second'),
        Effect.retry(Schedule.exponential(1000).pipe(Schedule.compose(Schedule.recurs(3)))),
        Effect.scoped,
      );
      return res.data.rates[to].toString();
    }).pipe(Effect.provide(FetchHttpClient.layer)),
});
