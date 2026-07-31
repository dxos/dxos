//
// Copyright 2025 DXOS.org
//

// TODO(wittjosiah): Refactor to use a dfx-style Effect-native client.

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Schedule from 'effect/Schedule';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { withAuthorization } from '@dxos/compute-runtime';
import { log } from '@dxos/log';

import { GoogleApiError } from '../../errors';
import { GoogleCredentials } from '../../services/google-credentials';

/**
 * Shared utilities for Google API integration (Gmail, Calendar, etc.)
 */

/**
 * Makes an authenticated HTTP request to a Google API endpoint.
 * Includes authorization, retry logic, and error handling.
 */
export const makeGoogleApiRequest = Effect.fn('makeGoogleApiRequest')(function* (
  url: string,
  options: { method?: string; body?: unknown } = {},
) {
  // Get token from GoogleCredentials (which falls back to CredentialsService).
  const token = yield* GoogleCredentials.get();

  const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));

  // TODO(wittjosiah): Without this, executing the request results in CORS errors when traced.
  //  Is this an issue on Google's side or is it a bug in `@effect/platform`?
  //  https://github.com/Effect-TS/effect/issues/4568
  const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

  let request;
  if (options.method === 'POST') {
    request = HttpClientRequest.post(url);
  } else if (options.method === 'DELETE') {
    request = HttpClientRequest.del(url);
  } else {
    request = HttpClientRequest.get(url);
  }

  if (options.body) {
    request = HttpClientRequest.bodyText(request, options.body as string);
  }

  const { status, body } = yield* request.pipe(
    HttpClientRequest.setHeader('accept', 'application/json'),
    httpClientWithTracerDisabled.execute,
    // Read status and body together. Google returns JSON on success and for most errors, but some
    // failures (notably 401 on an expired grant) come back as an HTML error page — parse defensively
    // so a non-JSON body classifies as a typed `GoogleApiError` below rather than throwing a raw
    // `SyntaxError` defect that no caller can recognize as an auth failure. DELETE returns 204 with an
    // empty body, which parses to `{}`.
    Effect.flatMap((res) => res.text.pipe(Effect.map((text) => ({ status: res.status, body: parseJsonBody(text) })))),
    Effect.timeout('10 second'),
    Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
    Effect.scoped,
    Effect.withSpan('GoogleApiRequest'),
  );

  const errorPayload = Predicate.isRecord(body) && Predicate.isRecord(body.error) ? body.error : undefined;
  if (status < 200 || status >= 300 || errorPayload) {
    // Google mirrors the HTTP status in `error.code`; fall back to the transport status when the body
    // is not the expected JSON error shape (e.g. an HTML error page).
    const code = typeof errorPayload?.code === 'number' ? errorPayload.code : status;
    const message = typeof errorPayload?.message === 'string' ? errorPayload.message : `HTTP ${status}`;
    log.warn('google api error', { url, code, message });
    return yield* Effect.fail(new GoogleApiError(code, message));
  }

  return body;
});

/** Parse a response body as JSON, falling back to the raw text when it isn't JSON (e.g. an HTML error page). */
const parseJsonBody = (text: string): unknown => {
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

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
