//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpApiClient from '@effect/platform/HttpApiClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientError from '@effect/platform/HttpClientError';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Ref from 'effect/Ref';

import { EdgeApi } from '@dxos/edge-protocol';
import { EDGE_CLIENT_TAG_HEADER, type EdgeErrorData, type EdgeFailure } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';

import { type EdgeApiClient } from './edge-api-client';
import { EdgeAuthChallengeError, EdgeRequestError } from './edge-api-errors';
import { type EdgeIdentity } from './edge-identity';
import { encodeAuthHeader } from './http-client';

/**
 * Effect service exposing the client derived from `@dxos/edge-protocol`'s `EdgeApi` contract.
 *
 * The derived client is augmented with a `transformClient` middleware that reproduces the
 * `BaseHttpClient` wire behavior: verifiable-presentation auth (reactive 401 challenge/retry),
 * the client-tag header, and W3C trace propagation. Failures are converted to typed
 * {@link EdgeRequestError}/{@link EdgeAuthChallengeError} by the {@link mapEdgeErrors} combinator
 * (applied at call sites, so the typed errors are visible to `Effect.catchTag`).
 *
 * Out of scope (kept on the hand-written/`@dxos/protocols` path): the streaming Anthropic AI route
 * (`EdgeAiHttpClient`) and the WebSocket `EdgeClient` — neither can be modeled as an
 * `HttpApiEndpoint`.
 */
export interface EdgeApiClientService {
  /** Derived client; endpoints are namespaced as `client.<group>.<endpoint>(...)`. */
  readonly client: EdgeApiClient;
  /**
   * Set (or replace) the identity used to answer verifiable-presentation challenges.
   * Clears the cached auth header when the identity changes (mirrors `BaseHttpClient.setIdentity`).
   */
  readonly setIdentity: (identity: EdgeIdentity) => Effect.Effect<void>;
}

export interface EdgeClientOptions {
  readonly baseUrl: string;
  /** Tag sent in {@link EDGE_CLIENT_TAG_HEADER} on every request (traffic metering). */
  readonly clientTag?: string;
  readonly identity?: EdgeIdentity;
}

interface AuthState {
  identity?: EdgeIdentity;
  /** Auth header cached until the identity changes or a fresh 401 challenge arrives. */
  authHeader?: string;
}

/** Build the derived client + `setIdentity` over the global `fetch` transport. */
const makeService = (options: EdgeClientOptions): Effect.Effect<EdgeApiClientService> =>
  Effect.gen(function* () {
    const authState = yield* Ref.make<AuthState>({ identity: options.identity });

    const client = yield* HttpApiClient.make(EdgeApi, {
      baseUrl: options.baseUrl,
      transformClient: makeAuthTransform(authState, options.clientTag),
    });

    const setIdentity: EdgeApiClientService['setIdentity'] = (identity) =>
      Ref.update(authState, (state) =>
        state.identity?.identityDid !== identity.identityDid || state.identity?.peerKey !== identity.peerKey
          ? { identity, authHeader: undefined }
          : state,
      );

    return { client, setIdentity };
  }).pipe(Effect.provide(FetchHttpClient.layer));

// Named `EdgeApiService` (not `EdgeClient`) to avoid clashing with the WebSocket `EdgeClient`.
export class EdgeApiService extends Context.Tag('@dxos/edge-client/EdgeApiService')<
  EdgeApiService,
  EdgeApiClientService
>() {
  /** Layer providing the service for Effect-native consumers. */
  static readonly layer = (options: EdgeClientOptions): Layer.Layer<EdgeApiService> =>
    Layer.effect(EdgeApiService, makeService(options));

  /**
   * Synchronous constructor for imperative consumers (class-based managers not yet ported to
   * Effect). `HttpApiClient.make` over the fetch transport has no async setup, so it runs
   * synchronously. Prefer {@link EdgeApiService.layer} in Effect code.
   */
  static readonly make = (options: EdgeClientOptions): EdgeApiClientService => Effect.runSync(makeService(options));
}

/**
 * Convert the derived client's transport/decode failures into typed edge errors. Apply at call
 * sites so the typed errors reach `Effect.catchTag` (the `HttpApiClient` `transformResponse` hook
 * erases error types, so mapping there would be invisible to callers).
 */
export const mapEdgeErrors = <A, R>(
  effect: Effect.Effect<A, unknown, R>,
): Effect.Effect<A, EdgeRequestError | EdgeAuthChallengeError, R> =>
  Effect.catchAll(effect, (error) => {
    if (error instanceof EdgeRequestError || error instanceof EdgeAuthChallengeError) {
      return Effect.fail(error);
    }
    if (HttpClientError.isHttpClientError(error) && error._tag === 'ResponseError') {
      return classifyResponseError(error);
    }
    // `RequestError` (transport/network) and any `ParseError` from a malformed success body are
    // non-graceful failures — surface as retryable request errors.
    const cause = error instanceof Error ? error : undefined;
    return Effect.fail(new EdgeRequestError({ message: cause?.message ?? String(error), isRetryable: true, cause }));
  });

//
// Auth + header middleware.
//

const makeAuthTransform =
  (authState: Ref.Ref<AuthState>, clientTag: string | undefined) =>
  (httpClient: HttpClient.HttpClient): HttpClient.HttpClient =>
    httpClient.pipe(
      // Header injection runs in `preprocess`, so `HttpClient.retry` below re-runs it (picking up a
      // freshly cached auth header) when it re-executes the request.
      HttpClient.mapRequestEffect((request) => injectHeaders(request, authState, clientTag)),
      // On a verifiable-presentation 401 challenge, present the credential, cache the auth header,
      // and fail with a retryable marker error so `retry` re-executes the request with it.
      HttpClient.transformResponse((response) =>
        Effect.flatMap(response, (res) => refreshOnAuthChallenge(res, authState)),
      ),
      HttpClient.retry({ times: 1, while: isAuthChallengeError }),
      // Route every non-success response into the error channel so `mapEdgeErrors` classifies it
      // from status/headers/body.
      HttpClient.transformResponse((response) => Effect.flatMap(response, routeFailures)),
    );

/**
 * Fail any non-success response so {@link classifyResponseError} can map it. Two failure shapes:
 *  - non-2xx: failed without reading the body, so classification reads the untouched original.
 *  - HTTP 2xx carrying edge's graceful-failure envelope (`success:false`, per `EdgeFailure`) — the
 *    edge worker returns handled errors this way and the endpoint success schemas are `EdgeSuccess`
 *    (success-only), so such a body would otherwise decode-fail with an opaque error and lose
 *    `data`/`message`.
 *
 * The single-use web body can only be consumed once, so a 2xx JSON body is read here and replayed
 * as a fresh {@link HttpClientResponse} for the success decoder / classifier downstream. Non-JSON
 * 2xx responses (e.g. blob downloads) carry no envelope and pass through untouched to avoid
 * corrupting binary payloads.
 */
const routeFailures = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> =>
  Effect.gen(function* () {
    const failResponse = (target: HttpClientResponse.HttpClientResponse) =>
      Effect.fail(
        new HttpClientError.ResponseError({ request: response.request, response: target, reason: 'StatusCode' }),
      );

    if (response.status < 200 || response.status >= 300) {
      return yield* failResponse(response);
    }
    const contentType = response.headers['content-type'] ?? '';
    if (!contentType.includes('application/json')) {
      return response;
    }
    const text = yield* response.text;
    const replayed = HttpClientResponse.fromWeb(
      response.request,
      new Response(text, { status: response.status, headers: { ...response.headers } }),
    );
    return isFailureEnvelope(text) ? yield* failResponse(replayed) : replayed;
  });

const isFailureEnvelope = (text: string): boolean => {
  try {
    return isEdgeFailure(JSON.parse(text));
  } catch {
    return false;
  }
};

const injectHeaders = (
  request: HttpClientRequest.HttpClientRequest,
  authState: Ref.Ref<AuthState>,
  clientTag: string | undefined,
): Effect.Effect<HttpClientRequest.HttpClientRequest> =>
  Effect.gen(function* () {
    const { authHeader } = yield* Ref.get(authState);
    let next = request;
    if (authHeader) {
      next = HttpClientRequest.setHeader(next, 'Authorization', authHeader);
    }
    if (clientTag) {
      next = HttpClientRequest.setHeader(next, EDGE_CLIENT_TAG_HEADER, clientTag);
    }
    const span = yield* Effect.option(Effect.currentSpan);
    if (span._tag === 'Some') {
      const { traceId, spanId, sampled } = span.value;
      next = HttpClientRequest.setHeader(next, 'traceparent', `00-${traceId}-${spanId}-${sampled ? '01' : '00'}`);
    }
    return next;
  });

/**
 * On a 401 carrying `WWW-Authenticate: VerifiablePresentation challenge=…`, present the credential,
 * cache the resulting auth header, and fail with a marker `ResponseError` so `HttpClient.retry`
 * re-executes the request (re-running header injection with the fresh header). 401s without the
 * header (upstream forwarded) and requests made before an identity is set pass through unchanged.
 * Stays within the `HttpClientError` channel.
 */
const refreshOnAuthChallenge = (
  response: HttpClientResponse.HttpClientResponse,
  authState: Ref.Ref<AuthState>,
): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> =>
  Effect.gen(function* () {
    const challenge = authChallengeHeader(response);
    if (response.status !== 401 || challenge === undefined) {
      return response;
    }
    const { identity } = yield* Ref.get(authState);
    if (!identity) {
      return response;
    }
    const authHeader = yield* presentAuthHeader(challenge, identity);
    yield* Ref.update(authState, (state) => ({ ...state, authHeader }));
    return yield* Effect.fail(
      new HttpClientError.ResponseError({ request: response.request, response, reason: 'StatusCode' }),
    );
  });

const isAuthChallengeError = (error: HttpClientError.HttpClientError): boolean =>
  error._tag === 'ResponseError' && error.response.status === 401 && authChallengeHeader(error.response) !== undefined;

const AUTH_SCHEME = 'VerifiablePresentation challenge=';

const authChallengeHeader = (response: HttpClientResponse.HttpClientResponse): string | undefined => {
  const header = response.headers['www-authenticate'];
  return header?.startsWith(AUTH_SCHEME) ? header.slice(AUTH_SCHEME.length) : undefined;
};

const presentAuthHeader = (challenge: string, identity: EdgeIdentity): Effect.Effect<string> =>
  Effect.promise(() => identity.presentCredentials({ challenge: Buffer.from(challenge, 'base64') })).pipe(
    Effect.map((presentation) =>
      encodeAuthHeader(schema.getCodecForType('dxos.halo.credentials.Presentation').encode(presentation)),
    ),
  );

//
// Error classification.
//

const classifyResponseError = (
  error: HttpClientError.ResponseError,
): Effect.Effect<never, EdgeRequestError | EdgeAuthChallengeError> =>
  Effect.gen(function* () {
    const { response } = error;
    const body = yield* readFailureBody(response);
    const challenge = body?.data?.type === 'auth_challenge' ? body.data.challenge : undefined;

    if (typeof challenge === 'string') {
      return yield* Effect.fail(new EdgeAuthChallengeError({ challenge, data: body!.data, cause: error }));
    }
    if (body?.success === false) {
      return yield* Effect.fail(
        new EdgeRequestError({
          message: body.message,
          data: body.data,
          // Graceful edge failures are retryable only when unqualified by `data` and rate-limited.
          isRetryable: body.data == null && response.headers['retry-after'] !== undefined,
          retryAfterMs: retryAfterMillis(response),
          cause: error,
        }),
      );
    }
    return yield* Effect.fail(
      new EdgeRequestError({
        message: `HTTP ${response.status}.`,
        isRetryable: isRetryableStatus(response.status),
        retryAfterMs: retryAfterMillis(response),
        cause: error,
      }),
    );
  });

const readFailureBody = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<EdgeFailure | undefined> =>
  response.json.pipe(
    Effect.map((body) => (isEdgeFailure(body) ? body : undefined)),
    Effect.orElseSucceed(() => undefined),
  );

const isEdgeFailure = (body: unknown): body is EdgeFailure =>
  typeof body === 'object' && body !== null && (body as any).success === false;

const retryAfterMillis = (response: HttpClientResponse.HttpClientResponse): number | undefined => {
  const value = Number(response.headers['retry-after']);
  return Number.isNaN(value) || value === 0 ? undefined : value * 1000;
};

const isRetryableStatus = (status: number): boolean => status !== 501 && !(status >= 400 && status < 500);

//
// Retry.
//

/**
 * Default per-request retry policy, replacing `EdgeHttpCallArgs.retry`; gated on `isRetryable` and
 * honoring the server's `retryAfterMs` (falling back to a fixed base delay) between attempts.
 * A disposed context interrupts the sleeping fiber, so no explicit abort check is needed.
 */
export const withEdgeRetry = <A, E extends { isRetryable?: boolean; retryAfterMs?: number }, R>(
  effect: Effect.Effect<A, E, R>,
  options?: { count?: number; baseDelayMs?: number },
): Effect.Effect<A, E, R> => {
  const baseDelayMs = options?.baseDelayMs ?? 1_000;
  const attempt = (remaining: number): Effect.Effect<A, E, R> =>
    Effect.catchAll(effect, (error) =>
      error.isRetryable && remaining > 0
        ? Effect.sleep(Duration.millis(error.retryAfterMs ?? baseDelayMs)).pipe(
            Effect.flatMap(() => attempt(remaining - 1)),
          )
        : Effect.fail(error),
    );
  return attempt(options?.count ?? 3);
};
