//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

const ForexEffect = Operation.make({
  meta: {
    key: 'org.dxos.script.forex-effect',
    name: 'Forex Effect',
    description: 'Returns the exchange rate between two currencies.',
  },
  input: Schema.Struct({
    from: Schema.String.annotations({ description: 'The source currency' }),
    to: Schema.String.annotations({ description: 'The target currency' }),
  }),
  output: Schema.Any,
});

export default ForexEffect.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ from: rawFrom, to: rawTo }) {
      const from = rawFrom.toUpperCase();
      const to = rawTo.toUpperCase();
      const json: any = yield* HttpClientRequest.get(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`).pipe(
        HttpClient.execute,
        Effect.flatMap((response) => response.json),
        Effect.timeout('5 seconds'),
        Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
        Effect.scoped,
      );

      const rate = json?.data?.rates?.[to];
      if (rate == null) {
        return yield* Effect.fail(new Error(`No rate found for ${from} -> ${to}`));
      }

      return rate.toString();
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);
