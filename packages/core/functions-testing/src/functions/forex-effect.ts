//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';

export default defineFunction({
  key: 'dxos.org/script/forex-effect',
  name: 'Forex Effect',
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: Schema.Struct({
    from: Schema.String.annotations({ description: 'The source currency' }),
    to: Schema.String.annotations({ description: 'The target currency' }),
  }),

  outputSchema: Schema.String.annotations({ description: 'The exchange rate between the two currencies' }),

  handler: Effect.fnUntraced(function* ({ data: { from, to } }: any) {
    const res = yield* HttpClientRequest.get(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`).pipe(
      HttpClient.execute,
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(
          Schema.Struct({
            data: Schema.Struct({ rates: Schema.Record({ key: Schema.String, value: Schema.Number }) }),
          }),
        ),
      ),
      Effect.timeout('1 second'),
      Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
      Effect.scoped,
    );

    return res.data.rates[to].toString();
  }, Effect.provide(FetchHttpClient.layer)),
});
