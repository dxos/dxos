//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import * as HttpApiClient from 'effect/unstable/httpapi/HttpApiClient';

import { EdgeApi } from '@dxos/edge-protocol';
import { log } from '@dxos/log';
import { EDGE_CLIENT_TAG_HEADER, type EdgeFailure } from '@dxos/protocols';

import {
  authenticateViaChallengeEndpoint,
  parseChallengeHeader,
  presentCredentialsForChallenge,
} from './auth-challenge';
import { type EdgeApiClient, fetchClientLayer } from './edge-api-client';
import { EdgeAuthChallengeError, EdgeRequestError } from './edge-api-errors';
import { type EdgeIdentity } from './edge-identity';
import { encodeAuthHeader } from './http-client';

/**
 * Effect service exposing the client derived from `@dxos/edge-protocol`'s `EdgeApi` contract.
 *
 * The derived client is augmented with a `transformClient` middleware that reproduces
 * `BaseHttpClient`'s wire behavior: proactive verifiable-presentation auth (an up-front `/auth`
 * fetch, cached and refreshed ahead of its advertised TTL, single-flighted across concurrent
 * requests — see {@link AuthCell}), falling back to the reactive 401-challenge/retry-once path for
 * servers whose `/auth` can only issue a challenge by rejecting, plus the client-tag and W3C trace
 * headers. Failures are converted to typed {@link EdgeRequestError}/{@link EdgeAuthChallengeError}
 * by the {@link mapEdgeErrors} combinator (applied at call sites, so the typed errors are visible to
 * `Effect.catchTag`).
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

/** Refresh the cached auth header this long before its advertised expiry, absorbing request latency and clock skew. */
const AUTH_REFRESH_MARGIN_MS = 30_000;

/**
 * Mutable holder for the proactive-auth state: the cached header, when it was acquired, the TTL
 * last advertised beside it, and a single-flight guard for the `/auth` prefetch. Plain (rather than
 * an Effect `Ref`) because JS is single-threaded and every mutation here happens synchronously or
 * within a `.then`/`.catch` continuation — mirrors the private fields on `BaseHttpClient`, which
 * this class reproduces for the Effect-native transport.
 */
class AuthCell {
  identity: EdgeIdentity | undefined;
  private _authHeader: string | undefined;
  private _authAcquiredAt: number | undefined;
  private _authTtlMs: number | undefined;
  private _prefetch: Promise<void> | undefined;

  constructor(identity: EdgeIdentity | undefined) {
    this.identity = identity;
  }

  get authHeader(): string | undefined {
    return this._authHeader;
  }

  setIdentity(identity: EdgeIdentity): void {
    if (this.identity?.identityDid === identity.identityDid && this.identity?.peerKey === identity.peerKey) {
      return;
    }
    this.identity = identity;
    this._authHeader = undefined;
    this._authAcquiredAt = undefined;
    // Drop any in-flight prefetch: it authenticates the previous identity, and awaiting it would
    // commit that identity's header for requests now belonging to the new one.
    this._prefetch = undefined;
  }

  setAuthHeaderFromChallenge(authHeader: string): void {
    this._authHeader = authHeader;
    // The 401 body carries no TTL, so the last advertised one (if any) still applies.
    this._authAcquiredAt = Date.now();
  }

  /** Stale means past the proactive-refresh point, not necessarily rejected yet. */
  private _isStale(): boolean {
    if (this._authAcquiredAt === undefined || this._authTtlMs === undefined) {
      return false;
    }
    const refreshAfterMs = Math.max(this._authTtlMs - AUTH_REFRESH_MARGIN_MS, Math.floor(this._authTtlMs / 2));
    return Date.now() - this._authAcquiredAt >= refreshAfterMs;
  }

  /**
   * Acquire an auth header up front by asking `/auth` for a challenge, single-flighted across
   * concurrent requests sharing a stale/absent header. Best-effort: failure leaves the header
   * unset and requests proceed unauthenticated, falling back to the reactive 401 path below.
   */
  prefetchIfNeeded(baseUrl: string): Promise<void> {
    if (!this.identity || (this._authHeader !== undefined && !this._isStale())) {
      return Promise.resolve();
    }
    if (this._prefetch) {
      return this._prefetch;
    }
    const identity = this.identity;
    const prefetch: Promise<void> = authenticateViaChallengeEndpoint(baseUrl, identity)
      .then((authentication) => {
        // `setIdentity` may have swapped identities while the round trip was in flight;
        // committing then would send the new identity's requests signed as the old one.
        if (authentication && this.identity === identity) {
          this._authHeader = encodeAuthHeader(authentication.presentation);
          this._authAcquiredAt = Date.now();
          this._authTtlMs = authentication.expiresInMs ?? this._authTtlMs;
        }
      })
      .catch((error) => {
        log.verbose('auth prefetch failed; proceeding unauthenticated', { error });
      })
      .finally(() => {
        // Only if this promise still owns the guard: `setIdentity` clears it mid-flight, so a
        // newer prefetch may already have claimed it.
        if (this._prefetch === prefetch) {
          this._prefetch = undefined;
        }
      });
    this._prefetch = prefetch;
    return prefetch;
  }
}

/** Build the derived client + `setIdentity` over the global `fetch` transport. */
const makeService = (options: EdgeClientOptions): Effect.Effect<EdgeApiClientService> =>
  Effect.gen(function* () {
    const authCell = new AuthCell(options.identity);

    const client = yield* HttpApiClient.make(EdgeApi, {
      baseUrl: options.baseUrl,
      transformClient: makeAuthTransform(options.baseUrl, authCell, options.clientTag),
    });

    const setIdentity: EdgeApiClientService['setIdentity'] = (identity) =>
      Effect.sync(() => authCell.setIdentity(identity));

    return { client, setIdentity };
  }).pipe(Effect.provide(fetchClientLayer));

// Named `EdgeApiService` (not `EdgeClient`) to avoid clashing with the WebSocket `EdgeClient`.
export class EdgeApiService extends Context.Service<EdgeApiService, EdgeApiClientService>()(
  '@dxos/edge-client/EdgeApiService',
) {
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
  Effect.catch(effect, (error) => {
    if (error instanceof EdgeRequestError || error instanceof EdgeAuthChallengeError) {
      return Effect.fail(error);
    }
    if (HttpClientError.isHttpClientError(error) && error.reason._tag === 'StatusCodeError') {
      return classifyResponseError(error, error.reason.response);
    }
    // `HttpApiClient`'s own status-matching decode (not our `routeFailures` transform, which only
    // runs for `EdgeApiService`'s authed client — `anonymousClient()` has no `transformClient` at
    // all) fails every response whose status isn't declared in the endpoint's success/error map
    // with a `DecodeError`, not a `StatusCodeError` — e.g. every loose `Schema.Unknown`-success
    // endpoint (no declared error schema) hitting a real non-2xx refusal, such as `spaceExecQuery`'s
    // decode-failure 500. The response itself is unconsumed and still carries edge's usual
    // graceful-failure envelope, so classify it the same way rather than losing `message`/`data`
    // behind a generic "Decode error (...)" string.
    if (HttpClientError.isHttpClientError(error) && error.reason._tag === 'DecodeError') {
      return classifyResponseError(error, error.reason.response);
    }
    // Transport/encode/decode failures (network, malformed success body) are non-graceful — surface
    // as retryable request errors.
    const cause = error instanceof Error ? error : undefined;
    return Effect.fail(new EdgeRequestError({ message: cause?.message ?? String(error), isRetryable: true, cause }));
  });

//
// Auth + header middleware.
//

const makeAuthTransform =
  (baseUrl: string, authCell: AuthCell, clientTag: string | undefined) =>
  (httpClient: HttpClient.HttpClient): HttpClient.HttpClient =>
    httpClient.pipe(
      // Header injection runs in `preprocess`, so `HttpClient.retry` below re-runs it (picking up a
      // freshly cached auth header) when it re-executes the request.
      HttpClient.mapRequestEffect((request) => injectHeaders(request, baseUrl, authCell, clientTag)),
      // On a verifiable-presentation 401 challenge, present the credential, cache the auth header,
      // and fail with a retryable marker error so `retry` re-executes the request with it. This is
      // the fallback for servers whose `/auth` only issues a challenge by rejecting.
      HttpClient.transformResponse((response) =>
        Effect.flatMap(response, (res) => refreshOnAuthChallenge(res, authCell)),
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
        new HttpClientError.HttpClientError({
          reason: new HttpClientError.StatusCodeError({ request: response.request, response: target }),
        }),
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
  baseUrl: string,
  authCell: AuthCell,
  clientTag: string | undefined,
): Effect.Effect<HttpClientRequest.HttpClientRequest> =>
  Effect.gen(function* () {
    // Best-effort proactive `/auth` fetch (single-flighted, TTL-cached) before the request goes
    // out; a failure here leaves the header unset and the reactive 401 path below still applies.
    yield* Effect.promise(() => authCell.prefetchIfNeeded(baseUrl));

    let next = request;
    if (authCell.authHeader) {
      next = HttpClientRequest.setHeader(next, 'Authorization', authCell.authHeader);
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
 * cache the resulting auth header, and fail with a marker `StatusCodeError` so `HttpClient.retry`
 * re-executes the request (re-running header injection with the fresh header). 401s without a
 * signable challenge (upstream forwarded, or edge's own `challenge=""` when its server keypair is
 * unconfigured) and requests made before an identity is set pass through unchanged.
 */
const refreshOnAuthChallenge = (
  response: HttpClientResponse.HttpClientResponse,
  authCell: AuthCell,
): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> =>
  Effect.gen(function* () {
    const challenge = authChallengeHeader(response);
    if (response.status !== 401 || challenge === undefined || !authCell.identity) {
      return response;
    }
    const authHeader = yield* presentAuthHeader(challenge, authCell.identity);
    authCell.setAuthHeaderFromChallenge(authHeader);
    return yield* Effect.fail(
      new HttpClientError.HttpClientError({
        reason: new HttpClientError.StatusCodeError({ request: response.request, response }),
      }),
    );
  });

const isAuthChallengeError = (error: HttpClientError.HttpClientError): boolean =>
  error.reason._tag === 'StatusCodeError' &&
  error.reason.response.status === 401 &&
  authChallengeHeader(error.reason.response) !== undefined;

const authChallengeHeader = (response: HttpClientResponse.HttpClientResponse): string | undefined =>
  parseChallengeHeader(response.headers['www-authenticate']);

const presentAuthHeader = (challenge: string, identity: EdgeIdentity): Effect.Effect<string> =>
  Effect.promise(() => presentCredentialsForChallenge(identity, challenge)).pipe(Effect.map(encodeAuthHeader));

//
// Error classification.
//

const classifyResponseError = (
  error: HttpClientError.HttpClientError,
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<never, EdgeRequestError | EdgeAuthChallengeError> =>
  Effect.gen(function* () {
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
    Effect.catch(effect, (error) =>
      error.isRetryable && remaining > 0
        ? Effect.sleep(Duration.millis(error.retryAfterMs ?? baseDelayMs)).pipe(
            Effect.flatMap(() => attempt(remaining - 1)),
          )
        : Effect.fail(error),
    );
  return attempt(options?.count ?? 3);
};
