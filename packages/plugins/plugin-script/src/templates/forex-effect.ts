//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import { S, defineFunction } from 'dxos:functions';
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  // @ts-ignore
} from 'https://esm.sh/@effect/platform@0.89.0?deps=effect@3.17.0&bundle=false';
// @ts-ignore
import * as Effect from 'https://esm.sh/effect@3.17.0/Effect?bundle=false';
// @ts-ignore
import * as Schedule from 'https://esm.sh/effect@3.17.0/Schedule?bundle=false';

export default defineFunction({
  key: 'dxos.org/script/forex-effect',
  name: 'Forex Effect',
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: S.Struct({
    from: S.String.annotations({ description: 'The source currency' }),
    to: S.String.annotations({ description: 'The target currency' }),
  }),

  outputSchema: S.String.annotations({ description: 'The exchange rate between the two currencies' }),

  handler: async ({ data: { from, to } }: any) =>
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
