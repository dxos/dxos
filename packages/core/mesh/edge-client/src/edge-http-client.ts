//
// Copyright 2024 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { type Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type CompleteOAuthRegistrationRequest,
  type CompleteOAuthRegistrationResponse,
  type CreateAgentRequestBody,
  type CreateAgentResponseBody,
  EDGE_CLIENT_TAG_HEADER,
  type EdgeStatus,
  type ExecuteWorkflowResponseBody,
  type FeedProtocol,
  type GetAccessTokenRequest,
  type GetAccessTokenResponseBody,
  type GetAgentStatusResponseBody,
  type GetNotarizationResponseBody,
  type GetPluginsResponseBody,
  type InitiateOAuthFlowRequest,
  type InitiateOAuthFlowResponse,
  type JoinSpaceRequest,
  type JoinSpaceResponseBody,
  type ObjectId,
  type PostNotarizationRequestBody,
  type RecoverIdentityRequest,
  type RecoverIdentityResponseBody,
  type SerializedError,
  type UploadFunctionRequest,
  type UploadFunctionResponseBody,
} from '@dxos/protocols';
import {
  type QueryRequest as QueryRequestProto,
  type QueryResponse as QueryResponseProto,
} from '@dxos/protocols/proto/dxos/echo/query';
import { createUrl } from '@dxos/util';

import { BaseHttpClient, type BaseHttpClientOptions, type EdgeHttpCallArgs } from './base-http-client.ts';
import { proxyFetchLegacy } from './cors-proxy.ts';
import { HttpConfig, withLogging, withRetryConfig } from './http-client.ts';

export type { EdgeHttpCallArgs, RetryConfig } from './base-http-client.ts';

/**
 * HTTP wire shape returned by `/queue/.../query`.
 */
export type EdgeQueryQueueResponse = {
  objects?: unknown[];
  nextCursor?: string;
  prevCursor?: string;
};

export type UploadPluginBundleRequest = {
  slug: string;
  version: string;
  files: { path: string; content: string }[];
};

export type TriggersDispatcherStatus = {
  isActive: boolean;
  nextCronTaskRunTimestamp?: number;
  registeredTriggers: string[];
  stopAfterTimestamp?: number;
  remainingMs?: number;
  nextAlarmTimestamp?: number;
};

export type GetCronTriggersResponse = {
  cronIds: string[];
};

/**
 * Per-trigger runtime status reported by the EDGE dispatcher, keyed to the
 * trigger's ECHO object id so a client can correlate it with the replicated
 * `Trigger` object in its local database.
 *
 * Served by compute-service at `GET /compute/triggers/{spaceId}` (see
 * {@link EdgeHttpClient.getSpaceTriggers}).
 */
export type EdgeTriggerStatus = {
  /** ECHO object id of the trigger. */
  triggerId: ObjectId;
  /** Whether the EDGE dispatcher currently has this trigger registered. */
  registered: boolean;
  kind: 'timer' | 'subscription' | 'email' | 'webhook' | 'feed' | 'direct';
  /** Next scheduled cron execution (epoch ms). Set only for `timer` triggers. */
  nextExecutionTimestamp?: number;
  /** Cooldown expiry after a failure (epoch ms). */
  cooldownUntilTimestamp?: number;
  /** Outcome of the most recent invocation on the edge. */
  lastResult?: {
    status: 'success' | 'failure';
    /** Completion time (epoch ms). */
    timestamp: number;
    error?: SerializedError;
  };
};

/**
 * Response of `GET /compute/triggers/{spaceId}`: the full list of triggers registered on a space's
 * EDGE dispatcher, with runtime status. Polled by the remote trigger monitor to surface edge
 * trigger state.
 */
export type GetSpaceTriggersResponse = {
  /** Whether the space's edge dispatcher is active. */
  isActive: boolean;
  triggers: EdgeTriggerStatus[];
};

export type EdgeHttpClientOptions = BaseHttpClientOptions;

export class EdgeHttpClientService extends EffectContext.Service<EdgeHttpClientService, EdgeHttpClient>()(
  '@dxos/edge-client/EdgeHttpClient',
) {}

/**
 * HTTP client for the edge worker API (spaces, queues, functions, agents, etc.).
 *
 * Hub-service API (accounts, invitations) lives in {@link HubHttpClient} — the two
 * services run at different URLs and are never both available from the same base URL.
 */
export class EdgeHttpClient extends BaseHttpClient {
  constructor(baseUrl: string, options?: EdgeHttpClientOptions) {
    super(baseUrl, options);
    log('created', { url: this.baseUrl });
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
    return this._call(ctx, new URL('/identity/agents/create', this.baseUrl), {
      ...args,
      method: 'POST',
      body,
      auth: true,
    });
  }

  public getAgentStatus(
    ctx: Context,
    request: { ownerIdentityDid: string },
    args?: EdgeHttpCallArgs,
  ): Promise<GetAgentStatusResponseBody> {
    return this._call(ctx, new URL(`/identity/users/${request.ownerIdentityDid}/agent/status`, this.baseUrl), {
      ...args,
      method: 'GET',
      auth: true,
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
    return this._call(ctx, new URL(`/db/spaces/${spaceId}/notarization`, this.baseUrl), {
      ...args,
      method: 'GET',
      auth: true,
    });
  }

  public async notarizeCredentials(
    ctx: Context,
    spaceId: SpaceId,
    body: PostNotarizationRequestBody,
    args?: EdgeHttpCallArgs,
  ): Promise<void> {
    await this._call(ctx, new URL(`/db/spaces/${spaceId}/notarization`, this.baseUrl), {
      ...args,
      body,
      method: 'POST',
      auth: true,
    });
  }

  //
  // Identity
  //

  public async recoverIdentity(
    ctx: Context,
    body: RecoverIdentityRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<RecoverIdentityResponseBody> {
    return this._call(ctx, new URL('/db/identity/recover', this.baseUrl), { ...args, body, method: 'POST' });
  }

  /**
   * Names the space's root document, which edge cannot derive, and returns the root in force —
   * not necessarily the one offered, since the record is write-once.
   */
  public async recordSpaceRoot(
    ctx: Context,
    spaceId: SpaceId,
    body: { rootDocumentUrl: string },
    args?: EdgeHttpCallArgs,
  ): Promise<{ rootDocumentUrl: string }> {
    return this._call(ctx, new URL(`/db/spaces/${spaceId}/root`, this.baseUrl), {
      ...args,
      body,
      method: 'POST',
      auth: true,
    });
  }

  //
  // Invitations (space join)
  //

  public async joinSpaceByInvitation(
    ctx: Context,
    spaceId: SpaceId,
    body: JoinSpaceRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<JoinSpaceResponseBody> {
    return this._call(ctx, new URL(`/db/spaces/${spaceId}/join`, this.baseUrl), {
      ...args,
      body,
      method: 'POST',
      auth: true,
    });
  }

  //
  // OAuth
  //

  public async initiateOAuthFlow(
    ctx: Context,
    body: InitiateOAuthFlowRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<InitiateOAuthFlowResponse> {
    return this._call(ctx, new URL('/oauth/initiate', this.baseUrl), { ...args, body, method: 'POST', auth: true });
  }

  public async completeOAuthRegistration(
    ctx: Context,
    body: CompleteOAuthRegistrationRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<CompleteOAuthRegistrationResponse> {
    return this._call(ctx, new URL('/oauth/registration/complete', this.baseUrl), { ...args, body, method: 'POST' });
  }

  /**
   * Resolves the live access token behind a `MANAGED_ACCESS_TOKEN` placeholder. Authorized by the
   * caller's presentation: EDGE serves it only to members of the owning space.
   */
  public async getAccessToken(
    ctx: Context,
    body: GetAccessTokenRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<GetAccessTokenResponseBody> {
    return this._call(ctx, new URL('/oauth/token', this.baseUrl), { ...args, body, method: 'POST', auth: true });
  }

  //
  // Queues
  //

  public async queryQueue(
    ctx: Context,
    subspaceTag: string,
    spaceId: SpaceId,
    query: FeedProtocol.FeedQuery,
    args?: EdgeHttpCallArgs,
  ): Promise<EdgeQueryQueueResponse> {
    const queueId = query.feedIds?.[0];
    invariant(queueId, 'queueId required');
    return this._call(
      ctx,
      createUrl(new URL(`/db/spaces/${subspaceTag}/${spaceId}/queue/${queueId}/query`, this.baseUrl), {
        after: query.after,
        before: query.before,
        limit: query.limit,
        reverse: query.reverse,
        objectIds: query.objectIds?.join(','),
      }),
      { ...args, method: 'GET', auth: true },
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
    return this._call(ctx, new URL(`/db/spaces/${subspaceTag}/${spaceId}/queue/${queueId}`, this.baseUrl), {
      ...args,
      body: { objects },
      method: 'POST',
      auth: true,
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
      createUrl(new URL(`/db/spaces/${subspaceTag}/${spaceId}/queue/${queueId}`, this.baseUrl), {
        ids: objectIds.join(','),
      }),
      { ...args, method: 'DELETE', auth: true },
    );
  }

  //
  // Blobs
  //

  /**
   * Builds the URL for the blob stored under `key`. `key` is URL-encoded for defense in depth —
   * callers pass a lowercase hex SHA-256 digest (extracted from an `ni:` URI by the edge backend).
   */
  public getBlobUrl(key: string): URL {
    return new URL(`/blob/file/${encodeURIComponent(key)}`, this.baseUrl);
  }

  /**
   * Uploads bytes to the edge blob service, keyed by content hash. Pre-fetches `/auth` (`auth:
   * true`) so large bodies aren't sent twice on an auth challenge.
   */
  public async putBlob(
    ctx: Context,
    key: string,
    data: Uint8Array,
    args?: EdgeHttpCallArgs & { contentType?: string },
  ): Promise<void> {
    const headers: Record<string, string> = {};
    if (args?.contentType) {
      headers['Content-Type'] = args.contentType;
    }
    await this._callRaw(ctx, this.getBlobUrl(key), {
      retry: args?.retry,
      auth: args?.auth ?? true,
      method: 'POST',
      // `Uint8Array` is generic over `ArrayBufferLike` (incl. `SharedArrayBuffer`) while DOM's
      // `BodyInit` only covers `ArrayBuffer`-backed views — a gap between the DOM lib types and
      // the TS standard lib, not fixable by typing `data` differently.
      body: data as BodyInit,
      headers,
    });
  }

  /**
   * Downloads bytes previously stored with {@link putBlob}. Returns `undefined` if `key` is not
   * found.
   */
  public async getBlob(ctx: Context, key: string, args?: EdgeHttpCallArgs): Promise<Uint8Array | undefined> {
    const response = await this._callRaw(ctx, this.getBlobUrl(key), {
      ...args,
      method: 'GET',
      auth: args?.auth ?? true,
    });
    if (response.status === 404) {
      return undefined;
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  /**
   * Checks whether bytes are stored under `key`, without downloading them.
   */
  public async hasBlob(ctx: Context, key: string, args?: EdgeHttpCallArgs): Promise<boolean> {
    const response = await this._callRaw(ctx, this.getBlobUrl(key), {
      ...args,
      method: 'HEAD',
      auth: args?.auth ?? true,
    });
    return response.status !== 404;
  }

  /**
   * Deletes bytes stored under `key`. Not called by any core `Blob.remove` path in v1 (deletion is
   * deferred), provided for completeness.
   */
  public async deleteBlob(ctx: Context, key: string, args?: EdgeHttpCallArgs): Promise<void> {
    await this._callRaw(ctx, this.getBlobUrl(key), { ...args, method: 'DELETE', auth: args?.auth ?? true });
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
    // The function owner is the authenticated identity (edge requires ownerUri === presenter DID).
    // Prefer the connected identity's DID; otherwise use the DID supplied on the request body.
    const ownerUri = this._edgeIdentity?.identityDid ?? body.ownerUri;
    formData.append('ownerUri', ownerUri);
    formData.append('entryPoint', body.entryPoint);
    body.runtime && formData.append('runtime', body.runtime);
    for (const [filename, content] of Object.entries(body.assets)) {
      formData.append(
        'assets',
        new Blob([content as Uint8Array<ArrayBuffer>], { type: getFileMimeType(filename) }),
        filename,
      );
    }
    const path = ['/compute/functions', ...(pathParts.functionId ? [pathParts.functionId] : [])].join('/');
    return this._call(ctx, new URL(path, this.baseUrl), {
      ...args,
      body: formData,
      method: 'PUT',
      json: false,
      auth: true,
    });
  }

  public async listFunctions(ctx: Context, args?: EdgeHttpCallArgs): Promise<any> {
    return this._call(ctx, new URL('/compute/functions', this.baseUrl), { ...args, method: 'GET', auth: true });
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
    const url = new URL(`/compute/functions/${params.functionId}`, this.baseUrl);
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
    return this._call(ctx, url, { ...args, body: input, method: 'POST', auth: true });
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
    return this._call(ctx, new URL(`/compute/workflows/${spaceId}/${graphId}`, this.baseUrl), {
      ...args,
      body: input,
      method: 'POST',
      auth: true,
    });
  }

  //
  // Triggers
  //

  public async getCronTriggers(ctx: Context, spaceId: SpaceId): Promise<GetCronTriggersResponse> {
    return this._call<GetCronTriggersResponse>(
      ctx,
      new URL(`/compute/functions/${spaceId}/triggers/crons`, this.baseUrl),
      {
        method: 'GET',
        auth: true,
      },
    );
  }

  public async getTriggersDispatcherStatus(
    ctx: Context,
    spaceId: SpaceId,
    args?: EdgeHttpCallArgs,
  ): Promise<TriggersDispatcherStatus> {
    return this._call<TriggersDispatcherStatus>(ctx, new URL(`/compute/triggers/${spaceId}/status`, this.baseUrl), {
      ...args,
      method: 'GET',
      auth: true,
    });
  }

  public async forceRunCronTrigger(ctx: Context, spaceId: SpaceId, triggerId: ObjectId) {
    return this._call(ctx, new URL(`/compute/functions/${spaceId}/triggers/crons/${triggerId}/run`, this.baseUrl), {
      method: 'POST',
      auth: true,
    });
  }

  /**
   * Cancels the current run of a cron trigger on the EDGE dispatcher — its in-flight execution and
   * `runAgain` continuation chain. The trigger stays enabled, so its schedule keeps firing.
   */
  public async cancelTriggerRun(ctx: Context, spaceId: SpaceId, triggerId: ObjectId) {
    return this._call(ctx, new URL(`/compute/functions/${spaceId}/triggers/crons/${triggerId}/cancel`, this.baseUrl), {
      method: 'POST',
      auth: true,
    });
  }

  /**
   * Returns the full list of triggers registered on a space's EDGE dispatcher, with per-trigger
   * runtime status. Polled by the remote trigger monitor to surface edge trigger state.
   *
   * TODO(edge): Proposed endpoint; not yet implemented server-side.
   */
  public async getSpaceTriggers(
    ctx: Context,
    spaceId: SpaceId,
    args?: EdgeHttpCallArgs,
  ): Promise<GetSpaceTriggersResponse> {
    return this._call<GetSpaceTriggersResponse>(ctx, new URL(`/compute/triggers/${spaceId}`, this.baseUrl), {
      ...args,
      method: 'GET',
      auth: true,
    });
  }

  //
  // Query
  //

  public async execQuery(
    ctx: Context,
    spaceId: SpaceId,
    body: QueryRequestProto,
    args?: EdgeHttpCallArgs,
  ): Promise<QueryResponseProto> {
    return this._call(ctx, new URL(`/db/spaces/${spaceId}/exec-query`, this.baseUrl), {
      ...args,
      body,
      method: 'POST',
      auth: true,
    });
  }

  //
  // Registry
  //

  public async getRegistryPlugins(ctx: Context, args?: EdgeHttpCallArgs): Promise<GetPluginsResponseBody> {
    return this._call(ctx, new URL('/registry/plugins', this.baseUrl), { ...args, method: 'GET' });
  }

  /**
   * Uploads a built plugin bundle to the registry's R2-backed hosting. Authenticated
   * with the caller's hub identity (verifiable presentation) — `setIdentity` must
   * have been called. Returns the canonical `moduleUrl` (the hosted `manifest.json`).
   */
  public async uploadPluginBundle(
    ctx: Context,
    request: UploadPluginBundleRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<{ moduleUrl: string }> {
    return this._call(ctx, new URL('/registry/upload', this.baseUrl), {
      body: request,
      method: 'POST',
      auth: true,
      ...args,
    });
  }

  //
  // Proxy
  //

  /**
   * Fetch through the edge proxy for third-party REST APIs.
   * TEMPORARY: currently routes through legacy open proxy. See https://github.com/dxos/edge/pull/576.
   */
  public async proxyFetch(target: URL, init: RequestInit = {}): Promise<Response> {
    return proxyFetchLegacy(target, init, this._clientTag);
  }

  //
  // AI service.
  //

  /**
   * Issue an authenticated request to the EDGE AI route (`/ai/generate/anthropic/*`), which
   * proxies to the AI service. Used as the backend HTTP client for the Anthropic AI provider
   * (see {@link EdgeAiHttpClient}).
   *
   * Returns the raw `Response` so streaming bodies are forwarded unchanged to `@effect/ai`.
   * Requires an identity to have been set via {@link setIdentity}.
   */
  // TODO(mykola): Merge into `BaseHttpClient._call` once it can return a streaming/raw `Response`;
  // the auth/retry loop below duplicates the one in `_call`.
  public async anthropicAiRequest(request: Request): Promise<Response> {
    const incoming = new URL(request.url);
    const base = this.baseUrl.replace(/\/$/, '');
    const target = new URL(`${base}/ai/generate/anthropic${incoming.pathname}${incoming.search}`);

    const method = request.method;
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

    let handledAuth = false;
    while (true) {
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
      // Only retry edge auth when the 401 came from edge's own auth layer. Edge always sets
      // `WWW-Authenticate` on its own 401s; upstream-forwarded 401s (e.g. invalid BYOK rejected
      // by Anthropic) lack it and must be surfaced verbatim.
      if (response.status === 401 && response.headers.get('WWW-Authenticate') !== null && !handledAuth) {
        this._authHeader = await this._handleUnauthorized(response);
        handledAuth = true;
        continue;
      }

      return response;
    }
  }

  //
  // Internal (Effect-based, used by tests)
  //

  public async _fetch<T>(url: URL, _args: { method: string }): Promise<T> {
    return Function.pipe(
      HttpClient.execute(HttpClientRequest.make(_args.method as any)(url.toString())),
      withLogging,
      withRetryConfig,
      Effect.provide(FetchHttpClient.layer),
      Effect.provide(HttpConfig.default),
      Effect.withSpan('EdgeHttpClient'),
      EffectEx.runAndForwardErrors,
    ) as T;
  }
}

const getFileMimeType = (filename: string) =>
  ['.js', '.mjs'].some((ext) => filename.endsWith(ext))
    ? 'application/javascript+module'
    : filename.endsWith('.wasm')
      ? 'application/wasm'
      : 'application/octet-stream';
