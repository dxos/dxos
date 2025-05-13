//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
// @ts-ignore
import { defineFunction } from 'dxos:functions';
import {
  HttpClient,
  HttpClientRequest,
  FetchHttpClient,
  // @ts-ignore
} from 'https://esm.sh/@effect/platform@0.77.2?deps=effect@3.13.3';
// @ts-ignore
import { Effect, Schedule } from 'https://esm.sh/effect@3.13.3';

export default defineFunction({
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: Schema.Struct({
    from: Schema.String.annotations({ description: 'The source currency' }),
    to: Schema.String.annotations({ description: 'The target currency' }),
  }),

  outputSchema: Schema.String.annotations({ description: 'The exchange rate between the two currencies' }),

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
        Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
        Effect.scoped,
      );

      return res.data.rates[to].toString();
    }).pipe(Effect.provide(FetchHttpClient.layer)),
});
