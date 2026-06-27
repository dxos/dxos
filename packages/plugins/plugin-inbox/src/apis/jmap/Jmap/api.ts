//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { withAuthorization } from '@dxos/functions';

import { JmapApiError } from '../../../errors';
import { JmapCredentials } from '../../../services/jmap-credentials';
import { MethodError, Response, Session } from './types';

const REQUEST_TIMEOUT = '10 seconds';
const REQUEST_RETRY = Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)));

// Retry transient failures (network, 5xx, timeout) but not 4xx — a bad host/token or malformed
// request will fail identically on retry, so retrying only adds latency.
const shouldRetry = (error: unknown): boolean =>
  !(error instanceof JmapApiError && error.status !== undefined && error.status >= 400 && error.status < 500);

/** Capability set for read/write mail requests. */
export const MAIL_CAPABILITIES = ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'] as const;
/** Capability set including submission, required to send mail. */
export const SUBMISSION_CAPABILITIES = [...MAIL_CAPABILITIES, 'urn:ietf:params:jmap:submission'] as const;

/** A single `[methodName, args, callId]` invocation in a batched request. */
export type MethodCall = readonly [string, unknown, string];

/** A batched JMAP API request body (RFC 8620 §3.3). */
export type RequestBody = {
  readonly using: readonly string[];
  readonly methodCalls: readonly MethodCall[];
};

/**
 * Discovers the JMAP session: `GET https://${host}/.well-known/jmap` (the well-known URL
 * 302-redirects to the session resource, which `fetch` follows). Yields `apiUrl` +
 * `primaryAccounts`. Tracer disabled (Effect + CORS: https://github.com/Effect-TS/effect/issues/4568).
 */
export const getSession: Effect.Effect<Session, JmapApiError, HttpClient.HttpClient | JmapCredentials> = Effect.gen(
  function* () {
    const { host, token } = yield* JmapCredentials;
    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
    const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

    return yield* HttpClientRequest.get(`https://${host}/.well-known/jmap`).pipe(
      HttpClientRequest.setHeader('accept', 'application/json'),
      httpClientWithTracerDisabled.execute,
      Effect.flatMap(decodeJsonOrFail(Session)),
      Effect.timeout(REQUEST_TIMEOUT),
      Effect.retry({ schedule: REQUEST_RETRY, while: shouldRetry }),
      Effect.scoped,
      Effect.withSpan('JmapGetSession'),
      Effect.mapError(asJmapApiError),
    );
  },
);

/**
 * Issues a batched JMAP API request (single POST to the session `apiUrl`) and decodes the response
 * envelope. Read requests retry on transient failure; pass `{ retry: false }` for non-idempotent
 * writes (draft create + submission) so a retry can't double-send.
 */
export const jmapRequest = (
  apiUrl: string,
  body: RequestBody,
  options: { retry?: boolean } = {},
): Effect.Effect<Response, JmapApiError, HttpClient.HttpClient | JmapCredentials> =>
  Effect.gen(function* () {
    const { token } = yield* JmapCredentials;
    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
    const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

    const executed = HttpClientRequest.post(apiUrl).pipe(
      HttpClientRequest.setHeader('accept', 'application/json'),
      HttpClientRequest.bodyUnsafeJson(body),
      httpClientWithTracerDisabled.execute,
      Effect.flatMap(decodeJsonOrFail(Response)),
      Effect.timeout(REQUEST_TIMEOUT),
    );

    return yield* (
      options.retry === false ? executed : executed.pipe(Effect.retry({ schedule: REQUEST_RETRY, while: shouldRetry }))
    ).pipe(Effect.scoped, Effect.withSpan('JmapApiRequest'), Effect.mapError(asJmapApiError));
  });

/**
 * Extracts and decodes the result for a given `callId` from a response envelope. A method-level
 * `["error", …]` response (or a decode failure) becomes a typed {@link JmapApiError}.
 */
export const getMethodResponse = <A, I, R>(
  response: Response,
  callId: string,
  schema: Schema.Schema<A, I, R>,
): Effect.Effect<A, JmapApiError, R> => {
  const entry = response.methodResponses.find((methodResponse) => methodResponse[2] === callId);
  if (!entry) {
    return Effect.fail(new JmapApiError(undefined, `No method response for call ${callId}.`));
  }

  const [name, args] = entry;
  if (name === 'error') {
    return Schema.decodeUnknown(MethodError)(args).pipe(
      Effect.matchEffect({
        onFailure: () => Effect.fail(new JmapApiError(undefined, `JMAP method error (${callId}).`)),
        onSuccess: (error) => Effect.fail(new JmapApiError(undefined, error.description ?? error.type, error.type)),
      }),
    );
  }

  return Schema.decodeUnknown(schema)(args).pipe(Effect.mapError(asJmapApiError));
};

/** Decodes a 2xx JSON body against `schema`; a >=400 status fails with the (truncated) body text. */
const decodeJsonOrFail =
  <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  (response: HttpClientResponse.HttpClientResponse): Effect.Effect<A, JmapApiError, R> =>
    Effect.gen(function* () {
      if (response.status >= 400) {
        const body = yield* response.text;
        return yield* Effect.fail(new JmapApiError(response.status, truncate(body)));
      }
      return yield* HttpClientResponse.schemaBodyJson(schema)(response);
    }).pipe(Effect.mapError(asJmapApiError));

/** Collapses transport/decode failures (HttpClientError, ParseError, timeout) into a typed JmapApiError. */
const asJmapApiError = (error: unknown): JmapApiError =>
  error instanceof JmapApiError
    ? error
    : new JmapApiError(undefined, error instanceof Error ? error.message : String(error));

const truncate = (text: string, max = 500): string => (text.length > max ? `${text.slice(0, max)}…` : text);
