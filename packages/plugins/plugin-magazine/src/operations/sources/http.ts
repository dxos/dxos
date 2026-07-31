//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import type * as Schema from 'effect/Schema';

import { applyCorsProxy } from './cors';
import { FeedFetchError } from './feed-fetcher';

// Short, bounded retry so a transient hiccup doesn't fail a fetch, without stalling the form.
const retryPolicy = Schedule.exponential('500 millis').pipe(Schedule.compose(Schedule.recurs(2)));

/** GETs a URL (through the optional CORS proxy) and decodes the JSON body against `schema`. */
export const getJson = <A, I>(
  schema: Schema.Schema<A, I>,
  url: string,
  proxy?: string,
): Effect.Effect<A, FeedFetchError, HttpClient.HttpClient> =>
  HttpClientRequest.get(applyCorsProxy(url, proxy)).pipe(
    HttpClient.execute,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
    Effect.timeout('10 seconds'),
    Effect.retry(retryPolicy),
    Effect.scoped,
    Effect.mapError((cause) => new FeedFetchError({ message: `Fetch failed: ${url}`, cause })),
  );

/** GETs a URL (through the optional CORS proxy) and returns the response body as text. */
export const getText = (url: string, proxy?: string): Effect.Effect<string, FeedFetchError, HttpClient.HttpClient> =>
  HttpClientRequest.get(applyCorsProxy(url, proxy)).pipe(
    HttpClient.execute,
    Effect.flatMap((response) => response.text),
    Effect.timeout('10 seconds'),
    Effect.retry(retryPolicy),
    Effect.scoped,
    Effect.mapError((cause) => new FeedFetchError({ message: `Fetch failed: ${url}`, cause })),
  );
