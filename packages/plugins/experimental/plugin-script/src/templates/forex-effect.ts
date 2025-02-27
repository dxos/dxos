// @ts-ignore
import { defineFunction, S } from 'dxos:functions';
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpClientError,
  // @ts-ignore
} from 'https://esm.sh/@effect/platform@0.77.2?deps=effect@3.13.12';
// @ts-ignore
import { Effect, Schedule } from 'https://esm.sh/effect@3.13.2';

/**
 * Returns the exchange rate between two currencies.
 */
export default defineFunction({
  inputSchema: S.Struct({
    from: S.String.annotations({ description: 'The source currency' }),
    to: S.String.annotations({ description: 'The target currency' }),
  }),

  outputSchema: S.Struct({
    rate: S.Number,
  }),

  handler: async ({
    event: {
      data: { from, to },
    },
  }: any) =>
    HttpClientRequest.get(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`).pipe(
      HttpClient.fetchOk,
      HttpClientResponse.json,
      Effect.timeout('1 second'),
      Effect.retry(Schedule.exponential(1000).pipe(Schedule.compose(Schedule.recurs(3)))),
      Effect.map(({ data: { rates } }: any) => ({ rate: rates[to].toString() })),
    ),
});
