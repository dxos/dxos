//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import type * as Schema from 'effect/Schema';

import { applyCorsProxy } from './cors';

export class BookHiveFetchError extends Data.TaggedError('BookHiveFetchError')<{
  message: string;
  cause?: unknown;
}> {}

const retryPolicy = Schedule.exponential('500 millis').pipe(Schedule.compose(Schedule.recurs(2)));

/**
 * Fetch a URL and decode its JSON body against `schema`. Optionally routed through a CORS proxy.
 */
export const getJson = <A, I>(
  schema: Schema.Schema<A, I>,
  url: string,
  proxy?: string,
): Effect.Effect<A, BookHiveFetchError, HttpClient.HttpClient> =>
  HttpClientRequest.get(applyCorsProxy(url, proxy)).pipe(
    HttpClient.execute,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
    Effect.timeout('10 seconds'),
    Effect.retry(retryPolicy),
    Effect.scoped,
    Effect.mapError((cause) => new BookHiveFetchError({ message: `Fetch failed: ${url}`, cause })),
  );
