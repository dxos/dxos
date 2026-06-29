//
// Copyright 2024 DXOS.org
//

import { sleep } from '@dxos/async';
import { type TraceContextData, TRACE_SPAN_ATTRIBUTE, Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type EdgeFailure, EDGE_CLIENT_TAG_HEADER, EdgeAuthChallengeError, EdgeCallFailedError } from '@dxos/protocols';

import { type EdgeIdentity, handleAuthChallenge } from './edge-identity';
import { encodeAuthHeader } from './http-client';
import { getEdgeUrlWithProtocol } from './utils';

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
};

type HttpRequestArgs = {
  method: string;
  retry?: RetryConfig;
  body?: any;
  /** @default true */
  json?: boolean;
  auth?: boolean;
};

export abstract class BaseHttpClient {
  protected readonly _baseUrl: string;
  protected readonly _clientTag: string | undefined;
  protected _edgeIdentity: EdgeIdentity | undefined;
  /** Auth header cached until next 401. */
  protected _authHeader: string | undefined;

  constructor(baseUrl: string, options?: BaseHttpClientOptions) {
    this._baseUrl = getEdgeUrlWithProtocol(baseUrl, 'http');
    this._clientTag = options?.clientTag;
    log('created', { url: this._baseUrl });
  }

  get baseUrl() {
    return this._baseUrl;
  }

  setIdentity(identity: EdgeIdentity): void {
    if (this._edgeIdentity?.identityKey !== identity.identityKey || this._edgeIdentity?.peerKey !== identity.peerKey) {
      this._edgeIdentity = identity;
      this._authHeader = undefined;
    }
  }

  // TODO(mykola): Extend `_call` to support streaming/raw `Response` returns so
  // `EdgeHttpClient.anthropicAiRequest` can be absorbed here and the auth/retry loop
  // stops being duplicated across the two paths.
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
        if (!this._authHeader && args.auth) {
          const response = await fetch(new URL('/auth', this._baseUrl));
          if (response.status === 401) {
            this._authHeader = await this._handleUnauthorized(response);
          }
        }

        const request = createRequest(args, this._authHeader, traceHeaders, this._clientTag);
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
        } else if (response.status === 401 && response.headers.get('WWW-Authenticate') !== null && !handledAuth) {
          // Only retry edge auth when the 401 came from edge's own auth layer. Edge always sets
          // `WWW-Authenticate` on its own 401s; upstream-forwarded 401s lack it.
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
        processingError = EdgeCallFailedError.fromProcessingFailureCause(error);
      }

      if (processingError?.isRetryable && (await shouldRetry(ctx, processingError.retryAfterMs))) {
        log.verbose('retrying request', { url, processingError });
      } else {
        throw processingError!;
      }
    }
  }

  protected async _handleUnauthorized(response: Response): Promise<string> {
    if (!this._edgeIdentity) {
      log.warn('unauthorized response received before identity was set');
      throw await EdgeCallFailedError.fromHttpFailure(response);
    }
    const challenge = await handleAuthChallenge(response, this._edgeIdentity);
    return encodeAuthHeader(challenge);
  }
}

const createRequest = (
  { method, body, json = true }: HttpRequestArgs,
  authHeader: string | undefined,
  traceHeaders?: Record<string, string>,
  clientTag?: string,
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
