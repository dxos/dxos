//
// Copyright 2024 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type CreateAgentRequestBody,
  type CreateAgentResponseBody,
  type CreateSpaceRequest,
  type CreateSpaceResponseBody,
  EdgeAuthChallengeError,
  type EdgeBodyResponse,
  EdgeCallFailedError,
  type EdgeStatus,
  type ExecuteWorkflowResponseBody,
  type ExportBundleRequest,
  type ExportBundleResponse,
  type GetAgentStatusResponseBody,
  type GetNotarizationResponseBody,
  type ImportBundleRequest,
  type InitiateOAuthFlowRequest,
  type InitiateOAuthFlowResponse,
  type JoinSpaceRequest,
  type JoinSpaceResponseBody,
  type ObjectId,
  type PostNotarizationRequestBody,
  type QueryResult,
  type QueueQuery,
  type RecoverIdentityRequest,
  type RecoverIdentityResponseBody,
  type UploadFunctionRequest,
  type UploadFunctionResponseBody,
} from '@dxos/protocols';
import { createUrl } from '@dxos/util';

import { type EdgeIdentity, handleAuthChallenge } from './edge-identity';
import { HttpConfig, encodeAuthHeader, withLogging, withRetryConfig } from './http-client';
import { getEdgeUrlWithProtocol } from './utils';

const DEFAULT_RETRY_TIMEOUT = 1500;
const DEFAULT_RETRY_JITTER = 500;
const DEFAULT_MAX_RETRIES_COUNT = 3;
const WARNING_BODY_SIZE = 10 * 1024 * 1024; // 10MB

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
  context?: Context;
  retry?: RetryConfig;
  body?: any;
  /**
   * @default true
   */
  json?: boolean;

  /**
   * Do not expect a standard EDGE JSON response with a `success` field.
   */
  rawResponse?: boolean;
};

export type EdgeHttpGetArgs = Pick<EdgeHttpRequestArgs, 'context' | 'retry'>;
export type EdgeHttpPostArgs = Pick<EdgeHttpRequestArgs, 'context' | 'retry' | 'body'>;

export class EdgeHttpClient {
  private readonly _baseUrl: string;

  private _edgeIdentity: EdgeIdentity | undefined;

  /**
   * Auth header is cached until receiving the next 401 from EDGE, at which point it gets refreshed.
   */
  private _authHeader: string | undefined;

  constructor(baseUrl: string) {
    this._baseUrl = getEdgeUrlWithProtocol(baseUrl, 'http');
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

  public async getStatus(args?: EdgeHttpGetArgs): Promise<EdgeStatus> {
    return this._call(new URL('/status', this.baseUrl), { ...args, method: 'GET' });
  }

  //
  // Agents
  //

  public createAgent(body: CreateAgentRequestBody, args?: EdgeHttpGetArgs): Promise<CreateAgentResponseBody> {
    return this._call(new URL('/agents/create', this.baseUrl), { ...args, method: 'POST', body });
  }

  public getAgentStatus(
    request: { ownerIdentityKey: PublicKey },
    args?: EdgeHttpGetArgs,
  ): Promise<GetAgentStatusResponseBody> {
    return this._call(new URL(`/users/${request.ownerIdentityKey.toHex()}/agent/status`, this.baseUrl), {
      ...args,
      method: 'GET',
    });
  }

  //
  // Credentials
  //

  public getCredentialsForNotarization(spaceId: SpaceId, args?: EdgeHttpGetArgs): Promise<GetNotarizationResponseBody> {
    return this._call(new URL(`/spaces/${spaceId}/notarization`, this.baseUrl), { ...args, method: 'GET' });
  }

  public async notarizeCredentials(
    spaceId: SpaceId,
    body: PostNotarizationRequestBody,
    args?: EdgeHttpGetArgs,
  ): Promise<void> {
    await this._call(new URL(`/spaces/${spaceId}/notarization`, this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Identity
  //

  public async recoverIdentity(
    body: RecoverIdentityRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<RecoverIdentityResponseBody> {
    return this._call(new URL('/identity/recover', this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Invitations
  //

  public async joinSpaceByInvitation(
    spaceId: SpaceId,
    body: JoinSpaceRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<JoinSpaceResponseBody> {
    return this._call(new URL(`/spaces/${spaceId}/join`, this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // OAuth and credentials
  //

  public async initiateOAuthFlow(
    body: InitiateOAuthFlowRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<InitiateOAuthFlowResponse> {
    return this._call(new URL('/oauth/initiate', this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Spaces
  //

  async createSpace(body: CreateSpaceRequest, args?: EdgeHttpGetArgs): Promise<CreateSpaceResponseBody> {
    return this._call(new URL('/spaces/create', this.baseUrl), { ...args, body, method: 'POST' });
  }

  //
  // Queues
  //

  public async queryQueue(
    subspaceTag: string,
    spaceId: SpaceId,
    query: QueueQuery,
    args?: EdgeHttpGetArgs,
  ): Promise<QueryResult> {
    const { queueId } = query;
    return this._call(
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
    subspaceTag: string,
    spaceId: SpaceId,
    queueId: ObjectId,
    objects: unknown[],
    args?: EdgeHttpGetArgs,
  ): Promise<void> {
    return this._call(new URL(`/spaces/${subspaceTag}/${spaceId}/queue/${queueId}`, this.baseUrl), {
      ...args,
      body: { objects },
      method: 'POST',
    });
  }

  public async deleteFromQueue(
    subspaceTag: string,
    spaceId: SpaceId,
    queueId: ObjectId,
    objectIds: ObjectId[],
    args?: EdgeHttpGetArgs,
  ): Promise<void> {
    return this._call(
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
    pathParts: { functionId?: string },
    body: UploadFunctionRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<UploadFunctionResponseBody> {
    const formData = new FormData();
    formData.append('name', body.name ?? '');
    formData.append('version', body.version);
    formData.append('ownerPublicKey', body.ownerPublicKey);
    formData.append('entryPoint', body.entryPoint);
    for (const [filename, content] of Object.entries(body.assets)) {
      formData.append(
        'assets',
        new Blob([content as Uint8Array<ArrayBuffer>], { type: getFileMimeType(filename) }),
        filename,
      );
    }

    const path = ['functions', ...(pathParts.functionId ? [pathParts.functionId] : [])].join('/');
    return this._call(new URL(path, this.baseUrl), {
      ...args,
      body: formData,
      method: 'PUT',
      json: false,
    });
  }

  public async listFunctions(args?: EdgeHttpGetArgs): Promise<any> {
    return this._call(new URL('/functions', this.baseUrl), { ...args, method: 'GET' });
  }

  public async invokeFunction(
    params: {
      functionId: string;
      version?: string;
      spaceId?: SpaceId;
      cpuTimeLimit?: number;
      subrequestsLimit?: number;
    },
    input: unknown,
    args?: EdgeHttpGetArgs,
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

    return this._call(url, {
      ...args,
      body: input,
      method: 'POST',
      rawResponse: true,
    });
  }

  //
  // Workflows
  //

  public async executeWorkflow(
    spaceId: SpaceId,
    graphId: ObjectId,
    input: any,
    args?: EdgeHttpGetArgs,
  ): Promise<ExecuteWorkflowResponseBody> {
    return this._call(new URL(`/workflows/${spaceId}/${graphId}`, this.baseUrl), {
      ...args,
      body: input,
      method: 'POST',
    });
  }

  //
  // Triggers
  //

  public async getCronTriggers(spaceId: SpaceId) {
    return this._call(new URL(`/test/functions/${spaceId}/triggers/crons`, this.baseUrl), { method: 'GET' });
  }

  //
  // Import/Export space.
  //

  public async importBundle(
    spaceId: SpaceId, //
    body: ImportBundleRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<void> {
    return this._call(new URL(`/spaces/${spaceId}/import`, this.baseUrl), { ...args, body, method: 'PUT' });
  }

  public async exportBundle(
    spaceId: SpaceId,
    body: ExportBundleRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<ExportBundleResponse> {
    return this._call(new URL(`/spaces/${spaceId}/export`, this.baseUrl), {
      ...args,
      body,
      method: 'POST',
    });
  }

  //
  // Internal
  //

  private async _fetch<T>(url: URL, args: EdgeHttpRequestArgs): Promise<T> {
    return Function.pipe(
      HttpClient.get(url),
      withLogging,
      withRetryConfig,
      Effect.provide(FetchHttpClient.layer),
      Effect.provide(HttpConfig.default),
      Effect.withSpan('EdgeHttpClient'),
      Effect.runPromise,
    ) as T;
  }

  // TODO(burdon): Refactor with effect (see edge-http-client.test.ts).
  private async _call<T>(url: URL, args: EdgeHttpRequestArgs): Promise<T> {
    const shouldRetry = createRetryHandler(args);
    const requestContext = args.context ?? Context.default();
    log('fetch', { url, request: args.body });

    let handledAuth = false;
    while (true) {
      let processingError: EdgeCallFailedError | undefined = undefined;
      let retryAfterHeaderValue: number = Number.NaN;
      try {
        const request = createRequest(args, this._authHeader);
        const response = await fetch(url, request);
        retryAfterHeaderValue = Number(response.headers.get('Retry-After'));
        if (response.ok) {
          const body = (await response.json()) as EdgeBodyResponse<T>;

          if (args.rawResponse) {
            return body as any;
          }

          if (!('success' in body)) {
            return body;
          }

          if (body.success) {
            return body.data;
          }

          log.warn('unsuccessful edge response', { url, body });
          if (body.errorData?.type === 'auth_challenge' && typeof body.errorData?.challenge === 'string') {
            processingError = new EdgeAuthChallengeError(body.errorData.challenge, body.errorData);
          } else if (body.errorData) {
            processingError = EdgeCallFailedError.fromUnsuccessfulResponse(response, body);
          }
        } else if (response.status === 401 && !handledAuth) {
          this._authHeader = await this._handleUnauthorized(response);
          handledAuth = true;
          continue;
        } else {
          processingError = await EdgeCallFailedError.fromHttpFailure(response);
        }
      } catch (error: any) {
        processingError = EdgeCallFailedError.fromProcessingFailureCause(error);
      }

      if (processingError?.isRetryable && (await shouldRetry(requestContext, retryAfterHeaderValue))) {
        log('retrying edge request', { url, processingError });
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

  return {
    method,
    body: requestBody,
    headers,
  };
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
  return async (ctx: Context, retryAfter: number) => {
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
