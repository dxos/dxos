//
// Copyright 2025 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';

import { withAuthorization } from '@dxos/functions';
import { log } from '@dxos/log';

/**
 * Shared utilities for Google API integration (Gmail, Calendar, etc.)
 */

/**
 * Makes an authenticated HTTP request to a Google API endpoint.
 * Includes authorization, retry logic, and error handling.
 */
export const makeGoogleApiRequest = Effect.fnUntraced(function* (url: string) {
  const httpClient = yield* HttpClient.HttpClient.pipe(
    Effect.map(withAuthorization({ service: 'google.com' }, 'Bearer')),
  );

  // TODO(wittjosiah): Without this, executing the request results in CORS errors when traced.
  //  Is this an issue on Google's side or is it a bug in `@effect/platform`?
  //  https://github.com/Effect-TS/effect/issues/4568
  const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

  const response = yield* HttpClientRequest.get(url).pipe(
    HttpClientRequest.setHeader('accept', 'application/json'),
    httpClientWithTracerDisabled.execute,
    Effect.flatMap((res) => res.json),
    Effect.timeout('1 second'),
    Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
    Effect.scoped,
  );

  // TODO(burdon): Handle errors (esp. 401).
  if ((response as any).error) {
    // throw new Error((response as any).error);
    log.catch((response as any).error);
  }

  return response;
});

/**
 * Creates a URL from path segments and query parameters.
 * Filters out undefined/null path parts and parameters.
 */
export const createUrl = (parts: (string | undefined)[], params?: Record<string, any>): URL => {
  const url = new URL(parts.filter(Boolean).join('/'));
  if (params) {
    Object.entries(params)
      .filter(([_, value]) => value != null)
      .forEach(([key, value]) => url.searchParams.set(key, String(value)));
  }
  return url;
};
