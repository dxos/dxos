//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import type * as Schema from 'effect/Schema';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';

import { applyCorsProxy } from './cors.ts';
import { FeedFetchError } from './feed-fetcher.ts';

// Short, bounded retry so a transient hiccup doesn't fail a fetch, without stalling the form.
const retryPolicy = Schedule.exponential('500 millis').pipe(Schedule.upTo({ times: 2 }));

/** Longest stretch of a non-2xx response's body quoted in its error. */
const ERROR_BODY_EXCERPT_LENGTH = 200;

/** GETs a URL (through the optional CORS proxy) and decodes the JSON body against `schema`. */
export const getJson = <A, I>(
  schema: Schema.Codec<A, I>,
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

/**
 * GETs a URL (through the optional CORS proxy) and returns the response body as text.
 * A non-2xx response fails with its status and the start of its body, so an origin's rejection is not
 * mistaken downstream for a malformed document.
 */
export const getText = (url: string, proxy?: string): Effect.Effect<string, FeedFetchError, HttpClient.HttpClient> =>
  HttpClientRequest.get(applyCorsProxy(url, proxy)).pipe(
    HttpClient.execute,
    Effect.flatMap((response) => Effect.map(response.text, (body) => ({ status: response.status, body }))),
    Effect.timeout('10 seconds'),
    Effect.retry(retryPolicy),
    Effect.scoped,
    Effect.mapError((cause) => new FeedFetchError({ message: `Fetch failed: ${url}`, cause })),
    // Checked past the retry, so an origin that refuses (typically a WAF) is asked once rather than hammered.
    Effect.flatMap(({ status, body }) =>
      status >= 200 && status < 300 ? Effect.succeed(body) : Effect.fail(statusError(url, status, body)),
    ),
  );

const statusError = (url: string, status: number, body: string): FeedFetchError => {
  const text = body.replace(/\s+/g, ' ').trim();
  const excerpt = text.length > ERROR_BODY_EXCERPT_LENGTH ? `${text.slice(0, ERROR_BODY_EXCERPT_LENGTH)}…` : text;
  return new FeedFetchError({ message: `Fetch failed: ${url} (HTTP ${status})${excerpt ? `: ${excerpt}` : ''}` });
};
