//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

const ForexEffect = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.script.forexEffect'),
    name: 'Forex Effect',
    description: 'Returns the exchange rate between two currencies.',
  },
  input: Schema.Struct({
    from: Schema.String.annotate({ description: 'The source currency' }),
    to: Schema.String.annotate({ description: 'The target currency' }),
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
        Effect.retry(Schedule.exponential(1_000).pipe(Schedule.upTo({ times: 3 }))),
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
