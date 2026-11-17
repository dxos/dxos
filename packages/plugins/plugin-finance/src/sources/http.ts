//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Schedule from 'effect/Schedule';

import { BaseError } from '@dxos/errors';

/** A source that did not answer, or answered with something unusable. */
export class SourceError extends BaseError.extend('SourceError', 'Source request failed') {}

/** Yahoo answers 404 to a request without a browser user agent. */
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';

/** Names the tool to sites that ask bots to identify themselves (Reddit). */
export const TOOL_USER_AGENT = 'dxos-finance-research/0.1 (+https://dxos.org)';

/**
 * SEC EDGAR's fair-access policy refuses a user agent without a contact address; this is the DXOS project's public
 * contact (the one plugin-ibkr's EDGAR client already sends), not a person's.
 */
export const SEC_USER_AGENT = 'dxos-finance-research contact@dxos.org';

const get = (url: string, userAgent: string) =>
  HttpClientRequest.get(url).pipe(
    HttpClientRequest.setHeader('user-agent', userAgent),
    HttpClient.execute,
    Effect.flatMap(HttpClientResponse.filterStatusOk),
  );

/** GETs a URL's body as text, retrying transient failures. */
export const getText = (url: string, userAgent = BROWSER_USER_AGENT): Effect.Effect<string, SourceError> =>
  get(url, userAgent).pipe(
    Effect.flatMap((response) => response.text),
    Effect.timeout('30 seconds'),
    Effect.retry(Schedule.exponential('1 second').pipe(Schedule.upTo({ times: 2 }))),
    Effect.scoped,
    Effect.mapError((cause) => new SourceError({ message: `GET ${url} failed`, cause })),
    Effect.provide(FetchHttpClient.layer),
  );

/** GETs a URL's body as bytes, retrying transient failures. */
export const getBytes = (url: string, userAgent = BROWSER_USER_AGENT): Effect.Effect<Uint8Array, SourceError> =>
  get(url, userAgent).pipe(
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.map((buffer) => new Uint8Array(buffer)),
    Effect.timeout('60 seconds'),
    Effect.retry(Schedule.exponential('1 second').pipe(Schedule.upTo({ times: 2 }))),
    Effect.scoped,
    Effect.mapError((cause) => new SourceError({ message: `GET ${url} failed`, cause })),
    Effect.provide(FetchHttpClient.layer),
  );

/** Whether a failure was a 404 (or the 403 a CDN answers for a missing object), as for a day with no file. */
export const isNotFound = (error: SourceError): boolean => /\b40[34]\b/.test(String(error.cause));
