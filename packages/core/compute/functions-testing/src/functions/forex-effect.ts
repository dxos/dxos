//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';

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
  output: Schema.String.annotate({ description: 'The exchange rate between the two currencies' }),
});

export default ForexEffect.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ from, to }) {
      const res = yield* HttpClientRequest.get(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`).pipe(
        HttpClient.execute,
        Effect.flatMap(
          HttpClientResponse.schemaBodyJson(
            Schema.Struct({
              data: Schema.Struct({ rates: Schema.Record(Schema.String, Schema.Number) }),
            }),
          ),
        ),
        Effect.timeout('1 second'),
        Effect.retry(Schedule.exponential(1_000).pipe(Schedule.upTo({ times: 3 }))),
        Effect.scoped,
      );

      return res.data.rates[to].toString();
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);
