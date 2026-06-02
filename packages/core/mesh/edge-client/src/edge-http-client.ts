//
// Copyright 2024 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { sleep } from '@dxos/async';
import { Context, TRACE_SPAN_ATTRIBUTE, type TraceContextData } from '@dxos/context';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type CreateAgentRequestBody,
  type CreateAgentResponseBody,
  type CreateSpaceRequest,
  type CreateSpaceResponseBody,
  EDGE_CLIENT_TAG_HEADER,
  EdgeAuthChallengeError,
  EdgeCallFailedError,
  type EdgeFailure,
  type EdgeStatus,
  type ExecuteWorkflowResponseBody,
  type ExportBundleRequest,
  type ExportBundleResponse,
  type FeedProtocol,
  type GetAgentStatusResponseBody,
  type GetPluginVersionsResponseBody,
  type GetPluginsResponseBody,
  type GetNotarizationResponseBody,
  type ImportBundleRequest,
  type InitiateOAuthFlowRequest,
  type InitiateOAuthFlowResponse,
  type JoinSpaceRequest,
  type JoinSpaceResponseBody,
  type ObjectId,
  type PostNotarizationRequestBody,
  type RecoverIdentityRequest,
  type RecoverIdentityResponseBody,
  type UploadFunctionRequest,
  type UploadFunctionResponseBody,
} from '@dxos/protocols';
import {
  type QueryRequest as QueryRequestProto,
  type QueryResponse as QueryResponseProto,
} from '@dxos/protocols/proto/dxos/echo/query';
import { createUrl } from '@dxos/util';

import { type EdgeIdentity, handleAuthChallenge } from './edge-identity';
import { HttpConfig, encodeAuthHeader, withLogging, withRetryConfig } from './http-client';
import { getEdgeUrlWithProtocol } from './utils';

/**
 * HTTP wire shape returned by `/queue/.../query`. Unlike `FeedProtocol.QueryResult`
 * (the RPC proto type, which transports object payloads as JSON strings), the edge
 * HTTP endpoint embeds each object directly in the response JSON.
 */
export type EdgeQueryQueueResponse = {
  objects?: unknown[];
  nextCursor?: string;
  prevCursor?: string;
};

const DEFAULT_RETRY_TIMEOUT = 1500;
const DEFAULT_RETRY_JITTER = 500;
const DEFAULT_MAX_RETRIES_COUNT = 3;
const WARNING_BODY_SIZE = 10 * 1024 * 1024; // 10MB

// TEMPORARY: legacy standalone CORS proxy used by `proxyFetch` until the
// authenticated `/proxy/*` route on the main edge worker ships
// (https://github.com/dxos/edge/pull/576). Delete this constant when the
// commented-out authenticated branch in `proxyFetch` is restored.
const LEGACY_CORS_PROXY_URL = 'https://cors-proxy.dxos.workers.dev';

export type RetryConfig = {
  /**
   * A number of call retries, not counting the initial request.
   */
  count: number;
  /**
   * Delay before retries in ms.
   */
  timeout?: number;
  /**
   * A random amount of time before retrying to help prevent large bursts of requests.
   */
  jitter?: number;
};

type EdgeHttpRequestArgs = {
  method: string;
  retry?: RetryConfig;
  body?: any;
  /**
   * @default true
   */
  json?: boolean;

  /**
   * Force authentication.
   * This should be used for requests with large bodies to avoid sending the body twice.
   * The client will call /auth endpoint to generate the auth header.
   */
  auth?: boolean;
};

export type EdgeHttpCallArgs = Pick<EdgeHttpRequestArgs, 'retry' | 'auth'>;

export type GetCronTriggersResponse = {
  cronIds: string[];
};

/**
 * Runtime state of the per-space TriggersDispatcher Durable Object on Edge.
 */
export type TriggersDispatcherStatus = {
  isActive: boolean;
  nextCronTaskRunTimestamp?: number;
  registeredTriggers: string[];
  stopAfterTimestamp?: number;
  remainingMs?: number;
  nextAlarmTimestamp?: number;
};

export type EdgeHttpClientOptions = {
  /**
   * Tag included in the {@link EDGE_CLIENT_TAG_HEADER} header on every request.
   * Used on Edge to classify traffic for metering (e.g. `ci-e2e`).
   */
  clientTag?: string;
};

export class EdgeHttpClient {
  private readonly _baseUrl: string;
  private readonly _clientTag: string | undefined;

  private _edgeIdentity: EdgeIdentity | undefined;

  /**
   * Auth header is cached until receiving the next 401 from EDGE, at which point it gets refreshed.
   */
  private _authHeader: string | undefined;

  constructor(baseUrl: string, options?: EdgeHttpClientOptions) {
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

  //
  // Status
  //

  public async getStatus(ctx: Context, args?: EdgeHttpCallArgs): Promise<EdgeStatus> {
    return this._call(ctx, new URL('/status', this.baseUrl), { ...args, method: 'GET', auth: true });
  }

  //
  // Agents
  //

  public createAgent(
    ctx: Context,
    body: CreateAgentRequestBody,
    args?: EdgeHttpCallArgs,
  ): Promise<CreateAgentResponseBody> {
    return this._call(ctx, new URL('/agents/create', this.baseUrl), { ...args, method: 'POST', body });
  }

  public getAgentStatus(
    ctx: Context,
    request: { ownerIdentityKey: PublicKey },
    args?: EdgeHttpCallArgs,
  ): Promise<GetAgentStatusResponseBody> {
    return this._call(ctx, new URL(`/users/${request.ownerIdentityKey.toHex()}/agent/status`, this.baseUrl), {
      ...args,
      method: 'GET',
    });
  }

  //
  // Credentials
  //

  public getCredentialsForNotarization(
    ctx: Context,
    spaceId: SpaceId,
    args?: EdgeHttpCallArgs,
  ): Promise<GetNotarizationResponseBody> {
    return this._call(ctx, new URL(`/spaces/${spaceId}/notarization`, this.baseUrl), { ...args, method: 'GET' });
  }

  public async notarizeCredentials(
    ctx: Context,
    spaceId: SpaceId,
    body: PostNotarizationRequestBody,
    args?: EdgeHttpCallArgs,
  ): Promise<void> {
    await this._call(ctx, new URL(`/spaces/${spaceId}/notarization`, this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Identity
  //

  public async recoverIdentity(
    ctx: Context,
    body: RecoverIdentityRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<RecoverIdentityResponseBody> {
    return this._call(ctx, new URL('/identity/recover', this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Invitations
  //

  public async joinSpaceByInvitation(
    ctx: Context,
    spaceId: SpaceId,
    body: JoinSpaceRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<JoinSpaceResponseBody> {
    return this._call(ctx, new URL(`/spaces/${spaceId}/join`, this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // OAuth and credentials
  //

  public async initiateOAuthFlow(
    ctx: Context,
    body: InitiateOAuthFlowRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<InitiateOAuthFlowResponse> {
    return this._call(ctx, new URL('/oauth/initiate', this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Spaces
  //

  async createSpace(ctx: Context, body: CreateSpaceRequest, args?: EdgeHttpCallArgs): Promise<CreateSpaceResponseBody> {
    return this._call(ctx, new URL('/spaces/create', this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Queues
  //

  public async queryQueue(
    ctx: Context,
    subspaceTag: string,
    spaceId: SpaceId,
    query: FeedProtocol.QueueQuery,
    args?: EdgeHttpCallArgs,
  ): Promise<EdgeQueryQueueResponse> {
    const queueId = query.queueIds?.[0];
    invariant(queueId, 'queueId required');
    return this._call(
      ctx,
      createUrl(new URL(`/spaces/${subspaceTag}/${spaceId}/queue/${queueId}/query`, this.baseUrl), {
        after: query.after,
        before: query.before,
        limit: query.limit,
        reverse: query.reverse,
        objectIds: query.objectIds?.join(','),
      }),
      {
        ...args,
        method: 'GET',
      },
    );
  }

  public async insertIntoQueue(
    ctx: Context,
    subspaceTag: string,
    spaceId: SpaceId,
    queueId: ObjectId,
    objects: unknown[],
    args?: EdgeHttpCallArgs,
  ): Promise<void> {
    return this._call(ctx, new URL(`/spaces/${subspaceTag}/${spaceId}/queue/${queueId}`, this.baseUrl), {
      ...args,
      body: { objects },
      method: 'POST',
    });
  }

  public async deleteFromQueue(
    ctx: Context,
    subspaceTag: string,
    spaceId: SpaceId,
    queueId: ObjectId,
    objectIds: ObjectId[],
    args?: EdgeHttpCallArgs,
  ): Promise<void> {
    return this._call(
      ctx,
      createUrl(new URL(`/spaces/${subspaceTag}/${spaceId}/queue/${queueId}`, this.baseUrl), {
        ids: objectIds.join(','),
      }),
      {
        ...args,
        method: 'DELETE',
      },
    );
  }

  //
  // Functions
  //

  public async uploadFunction(
    ctx: Context,
    pathParts: { functionId?: string },
    body: UploadFunctionRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<UploadFunctionResponseBody> {
    const formData = new FormData();
    formData.append('name', body.name ?? '');
    formData.append('version', body.version);
    formData.append('ownerPublicKey', body.ownerPublicKey);
    formData.append('entryPoint', body.entryPoint);
    body.runtime && formData.append('runtime', body.runtime);
    for (const [filename, content] of Object.entries(body.assets)) {
      formData.append(
        'assets',
        new Blob([content as Uint8Array<ArrayBuffer>], { type: getFileMimeType(filename) }),
        filename,
      );
    }

    const path = ['functions', ...(pathParts.functionId ? [pathParts.functionId] : [])].join('/');
    return this._call(ctx, new URL(path, this.baseUrl), {
      ...args,
      body: formData,
      method: 'PUT',
      json: false,
    });
  }

  public async listFunctions(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/functions', this.baseUrl), { ...args, method: 'GET' });
  }

  public async invokeFunction(
    ctx: Context,
    params: {
      functionId: string;
      version?: string;
      spaceId?: SpaceId;
      cpuTimeLimit?: number;
      subrequestsLimit?: number;
    },
    input: unknown,
    args?: EdgeHttpCallArgs,
  ): Promise<any> {
    const url = new URL(`/functions/${params.functionId}`, this.baseUrl);
    if (params.version) {
      url.searchParams.set('version', params.version);
    }
    if (params.spaceId) {
      url.searchParams.set('spaceId', params.spaceId.toString());
    }
    if (params.cpuTimeLimit) {
      url.searchParams.set('cpuTimeLimit', params.cpuTimeLimit.toString());
    }
    if (params.subrequestsLimit) {
      url.searchParams.set('subrequestsLimit', params.subrequestsLimit.toString());
    }

    return this._call(ctx, url, {
      ...args,
      body: input,
      method: 'POST',
    });
  }

  //
  // Workflows
  //

  public async executeWorkflow(
    ctx: Context,
    spaceId: SpaceId,
    graphId: ObjectId,
    input: any,
    args?: EdgeHttpCallArgs,
  ): Promise<ExecuteWorkflowResponseBody> {
    return this._call(ctx, new URL(`/workflows/${spaceId}/${graphId}`, this.baseUrl), {
      ...args,
      body: input,
      method: 'POST',
    });
  }

  //
  // Triggers
  //

  public async getCronTriggers(ctx: Context, spaceId: SpaceId): Promise<GetCronTriggersResponse> {
    return this._call<GetCronTriggersResponse>(ctx, new URL(`/functions/${spaceId}/triggers/crons`, this.baseUrl), {
      method: 'GET',
    });
  }

  /**
   * Fetches TriggersDispatcher Durable Object runtime state for a space.
   */
  public async getTriggersDispatcherStatus(
    ctx: Context,
    spaceId: SpaceId,
    args?: EdgeHttpCallArgs,
  ): Promise<TriggersDispatcherStatus> {
    return this._call<TriggersDispatcherStatus>(ctx, new URL(`/triggers/${spaceId}/status`, this.baseUrl), {
      ...args,
      method: 'GET',
      auth: true,
    });
  }

  public async forceRunCronTrigger(ctx: Context, spaceId: SpaceId, triggerId: ObjectId) {
    return this._call(ctx, new URL(`/functions/${spaceId}/triggers/crons/${triggerId}/run`, this.baseUrl), {
      method: 'POST',
    });
  }

  //
  // Query
  //

  /**
   * Execute a QueryAST query against a space.
   */
  public async execQuery(
    ctx: Context,
    spaceId: SpaceId,
    body: QueryRequestProto,
    args?: EdgeHttpCallArgs,
  ): Promise<QueryResponseProto> {
    return this._call(ctx, new URL(`/spaces/${spaceId}/exec-query`, this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Registry
  //

  /**
   * Fetches the hydrated plugin directory from the Edge registry service.
   * Unauthenticated; safe to call without an identity.
   */
  public async getRegistryPlugins(ctx: Context, args?: EdgeHttpCallArgs): Promise<GetPluginsResponseBody> {
    return this._call(ctx, new URL('/registry/plugins', this.baseUrl), { ...args, method: 'GET' });
  }

  /**
   * Fetches the available release versions for a given plugin repo. `repo` is the
   * GitHub `owner/name` form; this method takes care of URL-encoding before issuing
   * the request. Unauthenticated; same surface area as {@link getRegistryPlugins}.
   *
   * Versions are returned newest first, suitable for direct rendering in a picker.
   */
  public async getRegistryPluginVersions(
    ctx: Context,
    repo: string,
    args?: EdgeHttpCallArgs,
  ): Promise<GetPluginVersionsResponseBody> {
    return this._call(ctx, new URL(`/registry/plugins/${encodeURIComponent(repo)}/versions`, this.baseUrl), {
      ...args,
      method: 'GET',
    });
  }

  //
  // Import/Export space.
  //

  public async importBundle(
    ctx: Context,
    spaceId: SpaceId,
    body: ImportBundleRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<void> {
    return this._call(ctx, new URL(`/spaces/${spaceId}/import`, this.baseUrl), { ...args, body, method: 'PUT' });
  }

  public async exportBundle(
    ctx: Context,
    spaceId: SpaceId,
    body: ExportBundleRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<ExportBundleResponse> {
    return this._call(ctx, new URL(`/spaces/${spaceId}/export`, this.baseUrl), {
      ...args,
      body,
      method: 'POST',
    });
  }

  //
  // Integration proxy.
  //

  /**
   * Fetch through the edge proxy, used by integration plugins (Discord, ...)
   * to call third-party REST APIs that don't set permissive CORS headers.
   *
   * `init.headers.Authorization` (caller-supplied) is preserved by prefixing
   * with `X-Cors-Proxy-Authorization`, since the proxy strips `Authorization`
   * on forwarding to avoid leaking the DXOS presentation upstream — the
   * prefix carries the upstream's bot token / token through.
   *
   * TEMPORARY: routed through the legacy standalone proxy at
   * `cors-proxy.dxos.workers.dev` (open, unauthenticated, path
   * `/<host>/<path>`) so that integration plugins can be tested before the
   * authenticated `/proxy/*` route on the main edge worker ships
   * (https://github.com/dxos/edge/pull/576). When that PR deploys, restore
   * the commented-out block below — it rewrites the target under
   * `${this.baseUrl}/proxy/...` and signs the request with the cached
   * verifiable presentation. The header-remap and `x-cors-proxy-*` override
   * conventions are unchanged between the two paths.
   */
  public async proxyFetch(target: URL, init: RequestInit = {}): Promise<Response> {
    return proxyFetchLegacy(target, init, this._clientTag);

    //
    // Restore once the authenticated route on the main edge worker is deployed:
    //
    // const proxyUrl = new URL(`/proxy/${target.host}${target.pathname}${target.search}`, this.baseUrl);
    // if (target.protocol === 'http:') {
    //   proxyUrl.searchParams.set('scheme', 'http');
    // }
    // const headers = remapAuthorizationForProxy(new Headers(init.headers ?? undefined));
    // let handledAuth = false;
    // while (true) {
    //   if (!this._authHeader) {
    //     const authResponse = await fetch(new URL('/auth', this.baseUrl));
    //     if (authResponse.status === 401) {
    //       this._authHeader = await this._handleUnauthorized(authResponse);
    //     }
    //   }
    //   const requestHeaders = new Headers(headers);
    //   if (this._authHeader) {
    //     requestHeaders.set('Authorization', this._authHeader);
    //   }
    //   if (this._clientTag) {
    //     requestHeaders.set(EDGE_CLIENT_TAG_HEADER, this._clientTag);
    //   }
    //   const response = await fetch(proxyUrl, { ...init, headers: requestHeaders });
    //   if (response.status === 401 && !handledAuth) {
    //     this._authHeader = await this._handleUnauthorized(response);
    //     handledAuth = true;
    //     continue;
    //   }
    //   return response;
    // }
  }

  //
  // AI service.
  //

  /**
   * Issue an authenticated request to the EDGE AI route (`/generate/anthropic/*`), which
   * proxies to the AI service. Used as the backend HTTP client for the Anthropic AI provider
   * (see {@link EdgeAiHttpClient}).
   *
   * The configured EDGE base URL and the `/generate/anthropic` prefix are authoritative — only
   * the path and query of `request.url` are taken from the incoming request (the host and any
   * sentinel apiUrl path are ignored). Returns the raw `Response` so streaming bodies are
   * forwarded unchanged to `@effect/ai`.
   *
   * The verifiable-presentation auth header is cached and refreshed on a 401, mirroring
   * {@link _call}. Requires an identity to have been set via {@link setIdentity}.
   */
  public async anthropicAiRequest(request: Request): Promise<Response> {
    const incoming = new URL(request.url);
    const base = this.baseUrl.replace(/\/$/, '');
    const target = new URL(`${base}/ai/generate/anthropic${incoming.pathname}${incoming.search}`);

    // Buffer the body up front so it can be re-sent if the cached auth header is rejected.
    const method = request.method;
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

    let handledAuth = false;
    while (true) {
      // Pre-authenticate to avoid sending the (potentially large) body twice on the common path.
      if (!this._authHeader) {
        const authResponse = await fetch(new URL('/auth', this.baseUrl));
        if (authResponse.status === 401) {
          this._authHeader = await this._handleUnauthorized(authResponse);
        }
      }

      const headers = new Headers(request.headers);
      if (this._authHeader) {
        headers.set('Authorization', this._authHeader);
      }
      if (this._clientTag) {
        headers.set(EDGE_CLIENT_TAG_HEADER, this._clientTag);
      }

      const response = await fetch(target, { method, headers, body, signal: request.signal });
      if (response.status === 401 && !handledAuth) {
        this._authHeader = await this._handleUnauthorized(response);
        handledAuth = true;
        continue;
      }

      return response;
    }
  }

  //
  // Internal
  //

  private async _fetch<T>(url: URL, _args: EdgeHttpRequestArgs): Promise<T> {
    return Function.pipe(
      HttpClient.get(url),
      withLogging,
      withRetryConfig,
      Effect.provide(FetchHttpClient.layer),
      Effect.provide(HttpConfig.default),
      Effect.withSpan('EdgeHttpClient'),
      runAndForwardErrors,
    ) as T;
  }

  // TODO(burdon): Refactor with effect (see edge-http-client.test.ts).
  private async _call<T>(ctx: Context, url: URL, args: EdgeHttpRequestArgs): Promise<T> {
    const shouldRetry = createRetryHandler(args);
    log('fetch', { url, request: args.body });

    const traceHeaders = getTraceHeaders(ctx);

    let handledAuth = false;
    const tryCount = 1;
    while (true) {
      let processingError: EdgeCallFailedError | undefined = undefined;
      try {
        if (!this._authHeader && args.auth) {
          const response = await fetch(new URL(`/auth`, this.baseUrl));
          if (response.status === 401) {
            this._authHeader = await this._handleUnauthorized(response);
          }
        }

        const request = createRequest(args, this._authHeader, traceHeaders, this._clientTag);
        log('call edge', { url, tryCount, authHeader: !!this._authHeader });
        const response = await fetch(url, request);

        if (response.ok) {
          const body = await response.clone().json();
          invariant(body, 'Expected body to be present');
          if (!('success' in body)) {
            return body;
          }
          if (body.success) {
            return body.data;
          }
        } else if (response.status === 401 && !handledAuth) {
          this._authHeader = await this._handleUnauthorized(response);
          handledAuth = true;
          continue;
        }

        const body: EdgeFailure =
          response.headers.get('Content-Type') === 'application/json' ? await response.clone().json() : undefined;

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
        log.verbose('retrying edge request', { url, processingError });
      } else {
        throw processingError!;
      }
    }
  }

  private async _handleUnauthorized(response: Response): Promise<string> {
    if (!this._edgeIdentity) {
      log.warn('unauthorized response received before identity was set');
      throw await EdgeCallFailedError.fromHttpFailure(response);
    }

    const challenge = await handleAuthChallenge(response, this._edgeIdentity);
    return encodeAuthHeader(challenge);
  }
}

const createRequest = (
  { method, body, json = true }: EdgeHttpRequestArgs,
  authHeader: string | undefined,
  traceHeaders?: Record<string, string>,
  clientTag?: string,
): RequestInit => {
  let requestBody: BodyInit | undefined;
  const headers: HeadersInit = {};

  if (json) {
    requestBody = body && JSON.stringify(body);
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

  return {
    method,
    body: requestBody,
    headers,
  };
};

/**
 * Extract W3C Trace Context headers (traceparent/tracestate) from a DXOS Context.
 */
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

/**
 * @deprecated
 */
const createRetryHandler = ({ retry }: EdgeHttpRequestArgs) => {
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

const getFileMimeType = (filename: string) =>
  ['.js', '.mjs'].some((codeExtension) => filename.endsWith(codeExtension))
    ? 'application/javascript+module'
    : filename.endsWith('.wasm')
      ? 'application/wasm'
      : 'application/octet-stream';

/**
 * Move any caller-supplied `Authorization` header to `X-Cors-Proxy-Authorization`
 * so it survives the proxy hop. The edge proxy strips the top-level
 * `Authorization` (it carries the DXOS presentation, never to be leaked
 * upstream) and applies any `x-cors-proxy-*` override prefix as the actual
 * upstream header — which is exactly the channel we want for forwarding bot
 * tokens, OAuth tokens, etc.
 */
const remapAuthorizationForProxy = (headers: Headers): Headers => {
  const callerAuth = headers.get('Authorization');
  if (callerAuth !== null) {
    headers.delete('Authorization');
    headers.set('X-Cors-Proxy-Authorization', callerAuth);
  }
  return headers;
};

/**
 * Fetch through the legacy standalone open proxy at `cors-proxy.dxos.workers.dev`.
 *
 * No DXOS auth, no `EdgeHttpClient` instance required — pure URL rewrite +
 * header remap + `fetch`. Used by integration plugins from contexts that
 * don't have an `EdgeHttpClient` in scope (e.g. plugin-integration's
 * `credentialForm.onSubmit` and `onTokenCreated`, which run inside the
 * coordinator's runtime that does not provide `Capability.Service`).
 *
 * TEMPORARY — see `LEGACY_CORS_PROXY_URL`. When the authenticated `/proxy/*`
 * route on edge ships (https://github.com/dxos/edge/pull/576), delete this
 * function and route everything through `EdgeHttpClient.proxyFetch` again.
 */
export const proxyFetchLegacy = (target: URL, init: RequestInit = {}, clientTag?: string): Promise<Response> => {
  const proxyUrl = new URL(`/${target.host}${target.pathname}${target.search}`, LEGACY_CORS_PROXY_URL);
  if (target.protocol === 'http:') {
    proxyUrl.searchParams.set('scheme', 'http');
  }
  const requestHeaders = remapAuthorizationForProxy(new Headers(init.headers ?? undefined));
  if (clientTag) {
    requestHeaders.set(EDGE_CLIENT_TAG_HEADER, clientTag);
  }
  return fetch(proxyUrl, { ...init, headers: requestHeaders });
};
