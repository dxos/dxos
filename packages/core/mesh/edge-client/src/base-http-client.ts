//
// Copyright 2024 DXOS.org
//

import { sleep } from '@dxos/async';
import { Context, TRACE_SPAN_ATTRIBUTE, type TraceContextData } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { EDGE_CLIENT_TAG_HEADER, EdgeAuthChallengeError, EdgeCallFailedError, type EdgeFailure } from '@dxos/protocols';

import { authenticateViaChallengeEndpoint, handleAuthChallenge, parseChallengeHeader } from './auth-challenge.ts';
import { type EdgeIdentity } from './edge-identity.ts';
import { encodeAuthHeader } from './http-client.ts';
import { getEdgeUrlWithProtocol } from './utils.ts';

const DEFAULT_RETRY_TIMEOUT = 1500;
const DEFAULT_RETRY_JITTER = 500;
const DEFAULT_MAX_RETRIES_COUNT = 3;
const WARNING_BODY_SIZE = 10 * 1024 * 1024; // 10MB

export type RetryConfig = {
  /** Number of retries, not counting the initial request. */
  count: number;
  /** Delay before retries in ms. */
  timeout?: number;
  /** Random additional delay to spread retries. */
  jitter?: number;
};

export type EdgeHttpCallArgs = {
  retry?: RetryConfig;
  /**
   * Force authentication by pre-fetching `/auth` to obtain the challenge before
   * sending the body. Use for requests with large bodies to avoid sending twice.
   * Not available on HubHttpClient (hub-service has no `/auth` endpoint).
   */
  auth?: boolean;
};

export type BaseHttpClientOptions = {
  /**
   * Tag included in the {@link EDGE_CLIENT_TAG_HEADER} header on every request.
   * Used on Edge to classify traffic for metering (e.g. `ci-e2e`).
   */
  clientTag?: string;
  /**
   * Admin API key, sent as `Authorization: Bearer` on every request in place of the identity
   * verifiable-presentation flow — for headless callers (CI) that hold no HALO identity.
   */
  apiKey?: string;
};

type HttpRequestArgs = {
  method: string;
  retry?: RetryConfig;
  body?: any;
  /** @default true */
  json?: boolean;
  auth?: boolean;
};

export type RawHttpRequestArgs = {
  method: string;
  body?: BodyInit;
  headers?: Record<string, string>;
  retry?: RetryConfig;
  auth?: boolean;
};

export abstract class BaseHttpClient {
  protected readonly _baseUrl: string;
  protected readonly _clientTag: string | undefined;
  protected readonly _apiKey: string | undefined;
  protected _edgeIdentity: EdgeIdentity | undefined;
  /** Auth header cached until it goes stale (see `_authHeaderIsStale`) or a 401 replaces it. */
  protected _authHeader: string | undefined;
  /** When the current `_authHeader` was signed; with the TTL below it decides proactive refresh. */
  private _authAcquiredAt: number | undefined;
  /** Last TTL `/auth` advertised — a server constant, so 401-minted headers reuse it. */
  private _authTtlMs: number | undefined;
  /** Single-flight guard so concurrent requests with a stale header share one `/auth` round trip. */
  private _authPrefetch: Promise<void> | undefined;

  constructor(baseUrl: string, options?: BaseHttpClientOptions) {
    // Slash-terminated: `new URL('account/me', '…/hub')` would otherwise drop the `/hub` prefix.
    const url = getEdgeUrlWithProtocol(baseUrl, 'http');
    this._baseUrl = url.endsWith('/') ? url : `${url}/`;
    this._clientTag = options?.clientTag;
    this._apiKey = options?.apiKey;
    log('created', { url: this._baseUrl });
  }

  get baseUrl() {
    return this._baseUrl;
  }

  /**
   * The `Authorization` header this client would send on an authenticated call, minting one first
   * if none is cached or the cached one has gone stale.
   *
   * For callers that have to make an EDGE request outside this client — the native OAuth flow
   * issues `/oauth/initiate` from Rust, the only place the `Origin` header can be set to the
   * loopback callback server. Resolves undefined when there is nothing to present (no identity, or
   * the challenge round trip failed), which EDGE endpoints that `skipAuth` accept.
   */
  async getAuthHeader(): Promise<string | undefined> {
    if (this._apiKey) {
      return undefined;
    }
    const identity = this._edgeIdentity;
    if (!this._authHeader || this._authHeaderIsStale()) {
      await this._prefetchAuthHeader();
    }
    // `setIdentity` may have swapped identities while the prefetch was in flight, so the cached
    // header now belongs to the new one — handing it back would sign the caller's request, made on
    // behalf of the old identity, as somebody else.
    if (this._edgeIdentity !== identity) {
      return undefined;
    }
    return this._authHeader;
  }

  setIdentity(identity: EdgeIdentity): void {
    if (this._edgeIdentity?.identityDid !== identity.identityDid || this._edgeIdentity?.peerKey !== identity.peerKey) {
      this._edgeIdentity = identity;
      this._authHeader = undefined;
      this._authAcquiredAt = undefined;
      // Drop any in-flight prefetch: it authenticates the previous identity, and awaiting it
      // would commit that identity's header for requests now belonging to the new one.
      this._authPrefetch = undefined;
    }
  }

  protected async _call<T>(ctx: Context, url: URL, args: HttpRequestArgs): Promise<T> {
    const shouldRetry = createRetryHandler(args);
    // Log presence/size only — never log raw body contents which may contain PII.
    log('fetch', {
      url,
      hasBody: args.body !== undefined,
      bodySize: typeof args.body === 'string' ? args.body.length : undefined,
    });

    const traceHeaders = getTraceHeaders(ctx);

    let handledAuth = false;
    const tryCount = 1;
    while (true) {
      let processingError: EdgeCallFailedError | undefined = undefined;
      try {
        if (args.auth && !this._apiKey && (!this._authHeader || this._authHeaderIsStale())) {
          await this._prefetchAuthHeader();
        }

        const request = createRequest(args, this._authHeader, traceHeaders, this._clientTag, this._apiKey);
        log('call', { url, tryCount, authHeader: !!this._authHeader });
        const response = await fetch(url, request);

        if (response.ok) {
          const contentType = response.headers.get('Content-Type') ?? '';
          // No-content responses (204, empty body, non-JSON) — return undefined.
          if (
            response.status === 204 ||
            response.headers.get('Content-Length') === '0' ||
            !contentType.includes('application/json')
          ) {
            return undefined as T;
          }
          const body = await response.clone().json();
          if (typeof body !== 'object' || body === null) {
            return body;
          }
          if (!('success' in body)) {
            return body;
          }
          if (body.success) {
            return body.data;
          }
        } else if (response.status === 401 && hasVpChallenge(response) && !handledAuth) {
          // Only retry edge auth when the 401 came from edge's own auth layer. Edge always sets a
          // VP challenge on its own 401s; upstream-forwarded 401s carry none, or carry an
          // unrelated scheme.
          this._authHeader = await this._handleUnauthorized(response);
          handledAuth = true;
          continue;
        }

        const contentType = response.headers.get('Content-Type') ?? '';
        const body: EdgeFailure = contentType.startsWith('application/json')
          ? await response.clone().json()
          : undefined;

        invariant(!body?.success, 'Expected body to not be a failure response or undefined.');

        if (body?.data?.type === 'auth_challenge' && typeof body?.data?.challenge === 'string') {
          processingError = new EdgeAuthChallengeError(body.data.challenge, body.data);
        } else if (body?.success === false) {
          processingError = EdgeCallFailedError.fromUnsuccessfulResponse(response, body);
        } else {
          invariant(!response.ok, 'Expected response to not be ok.');
          processingError = await EdgeCallFailedError.fromHttpFailure(response);
        }
      } catch (error: any) {
        // A thrown EdgeCallFailedError already carries its retry semantics (e.g. the terminal
        // rejected-api-key 401) — wrapping it as a processing failure would mark it retryable.
        processingError =
          error instanceof EdgeCallFailedError ? error : EdgeCallFailedError.fromProcessingFailureCause(error);
      }

      if (processingError?.isRetryable && (await shouldRetry(ctx, processingError.retryAfterMs))) {
        log.verbose('retrying request', { url, processingError });
      } else {
        throw processingError!;
      }
    }
  }

  /**
   * Like {@link _call} but returns the raw `Response` instead of parsing a JSON envelope — for
   * endpoints with binary or absent response bodies (e.g. blob storage). A 404 is returned to the
   * caller rather than thrown, since "not found" is an expected outcome for lookups; all other
   * non-ok, non-retryable statuses throw `EdgeCallFailedError`, mirroring `_call`.
   *
   * NOTE: Duplicates `_call`'s auth/retry loop rather than sharing it, to avoid touching `_call`'s
   * broadly-depended-on JSON-envelope behavior. `EdgeHttpClient.anthropicAiRequest`'s separate
   * duplicate loop is a follow-up candidate for consolidating onto this method.
   */
  protected async _callRaw(ctx: Context, url: URL, args: RawHttpRequestArgs): Promise<Response> {
    const shouldRetry = createRetryHandler(args);
    log('fetch', { url, hasBody: args.body !== undefined });

    const traceHeaders = getTraceHeaders(ctx);

    let handledAuth = false;
    while (true) {
      let processingError: EdgeCallFailedError | undefined;
      try {
        if (args.auth && !this._apiKey && (!this._authHeader || this._authHeaderIsStale())) {
          await this._prefetchAuthHeader();
        }

        const headers: Record<string, string> = { ...args.headers };
        if (this._authHeader) {
          headers['Authorization'] = this._authHeader;
        } else if (this._apiKey) {
          // Canonical edgeAuth admin-key form; never collides with the VP header, since the
          // api-key path skips the auth flow that would populate it.
          headers['Authorization'] = `Bearer ${this._apiKey}`;
        }
        if (traceHeaders) {
          Object.assign(headers, traceHeaders);
        }
        if (this._clientTag) {
          headers[EDGE_CLIENT_TAG_HEADER] = this._clientTag;
        }

        const response = await fetch(url, { method: args.method, body: args.body, headers });

        if (response.ok || response.status === 404) {
          return response;
        }

        if (response.status === 401 && hasVpChallenge(response) && !handledAuth) {
          this._authHeader = await this._handleUnauthorized(response);
          handledAuth = true;
          continue;
        }

        processingError = await EdgeCallFailedError.fromHttpFailure(response);
      } catch (error: any) {
        // A thrown EdgeCallFailedError already carries its retry semantics (e.g. the terminal
        // rejected-api-key 401) — wrapping it as a processing failure would mark it retryable.
        processingError =
          error instanceof EdgeCallFailedError ? error : EdgeCallFailedError.fromProcessingFailureCause(error);
      }

      if (processingError?.isRetryable && (await shouldRetry(ctx, processingError.retryAfterMs))) {
        log.verbose('retrying raw request', { url, processingError });
      } else {
        throw processingError!;
      }
    }
  }

  /**
   * Acquire an auth header up front by asking `/auth` for a challenge.
   *
   * Best-effort: a failure here leaves `_authHeader` unset and the request proceeds
   * unauthenticated, falling back to the 401-and-retry path below. That fallback is what keeps
   * this working against servers whose `/auth` only issues a challenge by rejecting.
   *
   * The `catch` is what makes that true for *signing* failures, not just network ones:
   * `fetchAuthChallengeInfo` swallows its own fetch errors, but `presentCredentials` throws on a
   * device with no HALO chain (mid-invitation), and without this the rejection would surface from
   * `_call` as a failed request — turning a call that used to succeed unauthenticated into an error.
   */
  private _prefetchAuthHeader(): Promise<void> {
    if (this._authPrefetch) {
      return this._authPrefetch;
    }
    const prefetch: Promise<void> = this._prefetchAuthHeaderOnce()
      .catch((err) => {
        log.verbose('auth prefetch failed; proceeding unauthenticated', { err });
      })
      .finally(() => {
        // Only if this promise still owns the guard: `setIdentity` clears it mid-flight, so a
        // newer prefetch may already have claimed it, and clearing that one would let concurrent
        // callers each start their own `/auth` round trip and credential presentation.
        if (this._authPrefetch === prefetch) {
          this._authPrefetch = undefined;
        }
      });
    this._authPrefetch = prefetch;
    return prefetch;
  }

  private async _prefetchAuthHeaderOnce(): Promise<void> {
    const identity = this._edgeIdentity;
    if (!identity) {
      log.verbose('auth prefetch skipped: no identity set');
      return;
    }
    const authentication = await authenticateViaChallengeEndpoint(this._baseUrl, identity);
    // `setIdentity` may have swapped identities while the challenge round trip was in flight;
    // committing then would send the new identity's requests signed as the old one.
    if (authentication && this._edgeIdentity === identity) {
      this._authHeader = encodeAuthHeader(authentication.presentation);
      this._recordAuthAcquired(authentication.expiresInMs);
    }
  }

  /** Stale means past the proactive-refresh point, not necessarily rejected yet. */
  private _authHeaderIsStale(): boolean {
    if (this._authAcquiredAt === undefined || this._authTtlMs === undefined) {
      return false;
    }
    // Refresh a margin ahead of expiry, floored at half the TTL so tiny windows still refresh.
    const refreshAfterMs = Math.max(this._authTtlMs - AUTH_REFRESH_MARGIN_MS, Math.floor(this._authTtlMs / 2));
    return Date.now() - this._authAcquiredAt >= refreshAfterMs;
  }

  /**
   * Record when the current header was signed and the TTL advertised beside its challenge — only
   * originals; the refresh point is derived at read time. Without an advertised TTL (older
   * servers, the 401-minted path) the last known one is reused; if none was ever advertised the
   * header lives until a 401, exactly as before proactive refresh existed.
   */
  private _recordAuthAcquired(expiresInMs: number | undefined): void {
    this._authAcquiredAt = Date.now();
    this._authTtlMs = expiresInMs ?? this._authTtlMs;
  }

  protected async _handleUnauthorized(response: Response): Promise<string> {
    // A rejected API key is terminal — there is no challenge an identityless caller could answer.
    if (this._apiKey) {
      throw await EdgeCallFailedError.fromHttpFailure(response);
    }
    if (!this._edgeIdentity) {
      log.warn('unauthorized response received before identity was set');
      throw await EdgeCallFailedError.fromHttpFailure(response);
    }
    const challenge = await handleAuthChallenge(response, this._edgeIdentity);
    // The fresh header starts a new window; the 401 body carries no TTL, so the last one applies.
    this._recordAuthAcquired(undefined);
    return encodeAuthHeader(challenge);
  }
}

/** Refresh the cached auth header this long before its advertised expiry, absorbing request latency and clock skew. */
const AUTH_REFRESH_MARGIN_MS = 30_000;

/**
 * Whether a response carries a VerifiablePresentation challenge we can actually answer.
 *
 * Header *presence* is not enough: a 401 forwarded from upstream may carry an unrelated scheme
 * (`Bearer realm="…"`), and edge itself emits `challenge=""` when its server keypair is
 * unconfigured. Neither yields something signable, and retrying those through the auth path would
 * fail on the missing challenge and mask the real error.
 */
const hasVpChallenge = (response: Response): boolean =>
  parseChallengeHeader(response.headers.get('WWW-Authenticate')) !== undefined;

const createRequest = (
  { method, body, json = true }: HttpRequestArgs,
  authHeader: string | undefined,
  traceHeaders?: Record<string, string>,
  clientTag?: string,
  apiKey?: string,
): RequestInit => {
  let requestBody: BodyInit | undefined;
  const headers: HeadersInit = {};

  if (json) {
    requestBody = body === undefined ? undefined : JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  } else {
    requestBody = body;
  }

  if (typeof requestBody === 'string' && requestBody.length > WARNING_BODY_SIZE) {
    log.warn('Request with large body', { bodySize: requestBody.length });
  }

  if (authHeader) {
    headers['Authorization'] = authHeader;
  } else if (apiKey) {
    // Canonical edgeAuth admin-key form; never collides with the VP header, since the
    // api-key path skips the auth flow that would populate it.
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (traceHeaders) {
    Object.assign(headers, traceHeaders);
  }

  if (clientTag) {
    headers[EDGE_CLIENT_TAG_HEADER] = clientTag;
  }

  return { method, body: requestBody, headers };
};

const getTraceHeaders = (ctx: Context): Record<string, string> | undefined => {
  const traceCtx = ctx.getAttribute(TRACE_SPAN_ATTRIBUTE) as TraceContextData | undefined;
  if (!traceCtx) {
    return undefined;
  }
  const headers: Record<string, string> = { traceparent: traceCtx.traceparent };
  if (traceCtx.tracestate) {
    headers.tracestate = traceCtx.tracestate;
  }
  return headers;
};

/** @deprecated */
const createRetryHandler = ({ retry }: HttpRequestArgs) => {
  if (!retry || retry.count < 1) {
    return async () => false;
  }
  let retries = 0;
  const maxRetries = retry.count ?? DEFAULT_MAX_RETRIES_COUNT;
  const baseTimeout = retry.timeout ?? DEFAULT_RETRY_TIMEOUT;
  const jitter = retry.jitter ?? DEFAULT_RETRY_JITTER;
  return async (ctx: Context, retryAfter?: number) => {
    if (++retries > maxRetries || ctx.disposed) {
      return false;
    }
    if (retryAfter) {
      await sleep(retryAfter);
    } else {
      const timeout = baseTimeout + Math.random() * jitter;
      await sleep(timeout);
    }
    return true;
  };
};
