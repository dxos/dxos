//
// Copyright 2024 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';

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
  type CreateSpaceRequest,
  type CreateSpaceResponseBody,
  EDGE_CLIENT_TAG_HEADER,
  type EdgeStatus,
  type ExecuteWorkflowResponseBody,
  type ExportBundleRequest,
  type ExportBundleResponse,
  type FeedProtocol,
  type GetAgentStatusResponseBody,
  type GetNotarizationResponseBody,
  type GetPluginsResponseBody,
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

import { BaseHttpClient, type BaseHttpClientOptions, type EdgeHttpCallArgs } from './base-http-client';
import { proxyFetchLegacy } from './cors-proxy';
import { HttpConfig, withLogging, withRetryConfig } from './http-client';

export type { EdgeHttpCallArgs, RetryConfig } from './base-http-client';

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

export type EdgeHttpClientOptions = BaseHttpClientOptions;

export class EdgeHttpClientService extends EffectContext.Tag('@dxos/edge-client/EdgeHttpClient')<
  EdgeHttpClientService,
  EdgeHttpClient
>() {}

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
    return this._call(ctx, new URL('/agents/create', this.baseUrl), { ...args, method: 'POST', body });
  }

  public getAgentStatus(
    ctx: Context,
    request: { ownerIdentityDid: string },
    args?: EdgeHttpCallArgs,
  ): Promise<GetAgentStatusResponseBody> {
    return this._call(ctx, new URL(`/users/${request.ownerIdentityDid}/agent/status`, this.baseUrl), {
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
  // Invitations (space join)
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
  // OAuth
  //

  public async initiateOAuthFlow(
    ctx: Context,
    body: InitiateOAuthFlowRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<InitiateOAuthFlowResponse> {
    return this._call(ctx, new URL('/oauth/initiate', this.baseUrl), { ...args, body, method: 'POST' });
  }

  public async completeOAuthRegistration(
    ctx: Context,
    body: CompleteOAuthRegistrationRequest,
    args?: EdgeHttpCallArgs,
  ): Promise<CompleteOAuthRegistrationResponse> {
    return this._call(ctx, new URL('/oauth/registration/complete', this.baseUrl), { ...args, body, method: 'POST' });
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
    query: FeedProtocol.FeedQuery,
    args?: EdgeHttpCallArgs,
  ): Promise<EdgeQueryQueueResponse> {
    const queueId = query.feedIds?.[0];
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
      { ...args, method: 'GET' },
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
      { ...args, method: 'DELETE' },
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
    return new URL(`/api/file/${encodeURIComponent(key)}`, this.baseUrl);
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
    const response = await this._callRaw(ctx, this.getBlobUrl(key), { ...args, method: 'GET' });
    if (response.status === 404) {
      return undefined;
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  /**
   * Checks whether bytes are stored under `key`, without downloading them.
   */
  public async hasBlob(ctx: Context, key: string, args?: EdgeHttpCallArgs): Promise<boolean> {
    const response = await this._callRaw(ctx, this.getBlobUrl(key), { ...args, method: 'HEAD' });
    return response.status !== 404;
  }

  /**
   * Deletes bytes stored under `key`. Not called by any core `Blob.remove` path in v1 (deletion is
   * deferred), provided for completeness.
   */
  public async deleteBlob(ctx: Context, key: string, args?: EdgeHttpCallArgs): Promise<void> {
    await this._callRaw(ctx, this.getBlobUrl(key), { ...args, method: 'DELETE' });
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
    const path = ['functions', ...(pathParts.functionId ? [pathParts.functionId] : [])].join('/');
    return this._call(ctx, new URL(path, this.baseUrl), { ...args, body: formData, method: 'PUT', json: false });
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
    return this._call(ctx, url, { ...args, body: input, method: 'POST' });
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
  // Import/Export
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
    return this._call(ctx, new URL(`/spaces/${spaceId}/export`, this.baseUrl), { ...args, body, method: 'POST' });
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

/**
 * Layer constructing an {@link EdgeHttpClient} for the edge worker API.
 */
export const EdgeHttpClientLayer = (
  baseUrl: string,
  options?: EdgeHttpClientOptions,
): Layer.Layer<EdgeHttpClientService> => Layer.sync(EdgeHttpClientService, () => new EdgeHttpClient(baseUrl, options));
