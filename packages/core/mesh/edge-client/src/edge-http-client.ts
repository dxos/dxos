//
// Copyright 2024 DXOS.org
//

import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Effect, pipe } from 'effect';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type CreateAgentResponseBody,
  type CreateAgentRequestBody,
  type CreateSpaceRequest,
  type CreateSpaceResponseBody,
  EdgeAuthChallengeError,
  EdgeCallFailedError,
  type EdgeHttpResponse,
  type ExecuteWorkflowResponseBody,
  type GetAgentStatusResponseBody,
  type GetNotarizationResponseBody,
  type InitiateOAuthFlowRequest,
  type InitiateOAuthFlowResponse,
  type JoinSpaceRequest,
  type JoinSpaceResponseBody,
  type RecoverIdentityRequest,
  type RecoverIdentityResponseBody,
  type ObjectId,
  type PostNotarizationRequestBody,
  type QueueQuery,
  type QueryResult,
  type UploadFunctionRequest,
  type UploadFunctionResponseBody,
} from '@dxos/protocols';
import { createUrl } from '@dxos/util';

import { type EdgeIdentity, handleAuthChallenge } from './edge-identity';
import { encodeAuthHeader, HttpConfig, withLogging, withRetryConfig } from './http-client';
import { getEdgeUrlWithProtocol } from './utils';

// TODO(burdon): Move to protocols.
type GetStatusResponseBody = {
  status: 'ok' | 'error';
  error?: string;
};

const DEFAULT_RETRY_TIMEOUT = 1500;
const DEFAULT_RETRY_JITTER = 500;
const DEFAULT_MAX_RETRIES_COUNT = 3;

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

  // TODO(burdon): Implement status endpoint.
  public async getStatus(args?: EdgeHttpGetArgs): Promise<GetStatusResponseBody> {
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
    const path = ['functions', ...(pathParts.functionId ? [pathParts.functionId] : [])].join('/');
    return this._call(new URL(path, this.baseUrl), { ...args, body, method: 'PUT' });
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
  // Internal
  //

  private async _fetch<T>(url: URL, args: EdgeHttpRequestArgs): Promise<T> {
    return pipe(
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
    const requestContext = args.context ?? new Context();
    log.info('fetch', { url, request: args.body });

    let handledAuth = false;
    while (true) {
      let processingError: EdgeCallFailedError;
      let retryAfterHeaderValue: number = Number.NaN;
      try {
        const request = createRequest(args, this._authHeader);
        const response = await fetch(url, request);
        retryAfterHeaderValue = Number(response.headers.get('Retry-After'));
        if (response.ok) {
          const body = (await response.json()) as EdgeHttpResponse<T>;
          if (body.success) {
            return body.data;
          }

          log.warn('unsuccessful edge response', { url, body });
          if (body.errorData?.type === 'auth_challenge' && typeof body.errorData?.challenge === 'string') {
            processingError = new EdgeAuthChallengeError(body.errorData.challenge, body.errorData);
          } else {
            processingError = EdgeCallFailedError.fromUnsuccessfulResponse(response, body);
          }
        } else if (response.status === 401 && !handledAuth) {
          this._authHeader = await this._handleUnauthorized(response);
          handledAuth = true;
          continue;
        } else {
          processingError = EdgeCallFailedError.fromHttpFailure(response);
        }
      } catch (error: any) {
        processingError = EdgeCallFailedError.fromProcessingFailureCause(error);
      }

      if (processingError.isRetryable && (await shouldRetry(requestContext, retryAfterHeaderValue))) {
        log('retrying edge request', { url, processingError });
      } else {
        throw processingError;
      }
    }
  }

  private async _handleUnauthorized(response: Response): Promise<string> {
    if (!this._edgeIdentity) {
      log.warn('unauthorized response received before identity was set');
      throw EdgeCallFailedError.fromHttpFailure(response);
    }

    const challenge = await handleAuthChallenge(response, this._edgeIdentity);
    return encodeAuthHeader(challenge);
  }
}

const createRequest = ({ method, body }: EdgeHttpRequestArgs, authHeader: string | undefined): RequestInit => {
  return {
    method,
    body: body && JSON.stringify(body),
    headers: authHeader ? { Authorization: authHeader } : undefined,
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
