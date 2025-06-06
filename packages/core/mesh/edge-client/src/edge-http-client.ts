//
// Copyright 2024 DXOS.org
//

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  EdgeCallFailedError,
  type EdgeHttpResponse,
  type GetNotarizationResponseBody,
  type PostNotarizationRequestBody,
  type JoinSpaceRequest,
  type JoinSpaceResponseBody,
  EdgeAuthChallengeError,
  type CreateAgentResponseBody,
  type CreateAgentRequestBody,
  type GetAgentStatusResponseBody,
  type RecoverIdentityRequest,
  type RecoverIdentityResponseBody,
  type UploadFunctionRequest,
  type UploadFunctionResponseBody,
  type ObjectId,
  type ExecuteWorkflowResponseBody,
  type QueueQuery,
  type QueryResult,
  type InitiateOAuthFlowRequest,
  type InitiateOAuthFlowResponse,
  type CreateSpaceRequest,
  type CreateSpaceResponseBody,
} from '@dxos/protocols';

import { type EdgeIdentity, handleAuthChallenge } from './edge-identity';
import { getEdgeUrlWithProtocol } from './utils';

const DEFAULT_RETRY_TIMEOUT = 1500;
const DEFAULT_RETRY_JITTER = 500;
const DEFAULT_MAX_RETRIES_COUNT = 3;

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

  public createAgent(body: CreateAgentRequestBody, args?: EdgeHttpGetArgs): Promise<CreateAgentResponseBody> {
    return this._call('/agents/create', { ...args, method: 'POST', body });
  }

  public getAgentStatus(
    request: { ownerIdentityKey: PublicKey },
    args?: EdgeHttpGetArgs,
  ): Promise<GetAgentStatusResponseBody> {
    return this._call(`/users/${request.ownerIdentityKey.toHex()}/agent/status`, { ...args, method: 'GET' });
  }

  public getCredentialsForNotarization(spaceId: SpaceId, args?: EdgeHttpGetArgs): Promise<GetNotarizationResponseBody> {
    return this._call(`/spaces/${spaceId}/notarization`, { ...args, method: 'GET' });
  }

  public async notarizeCredentials(
    spaceId: SpaceId,
    body: PostNotarizationRequestBody,
    args?: EdgeHttpGetArgs,
  ): Promise<void> {
    await this._call(`/spaces/${spaceId}/notarization`, { ...args, body, method: 'POST' });
  }

  public async joinSpaceByInvitation(
    spaceId: SpaceId,
    body: JoinSpaceRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<JoinSpaceResponseBody> {
    return this._call(`/spaces/${spaceId}/join`, { ...args, body, method: 'POST' });
  }

  public async recoverIdentity(
    body: RecoverIdentityRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<RecoverIdentityResponseBody> {
    return this._call('/identity/recover', { ...args, body, method: 'POST' });
  }

  public async executeWorkflow(
    spaceId: SpaceId,
    graphId: ObjectId,
    input: any,
    args?: EdgeHttpGetArgs,
  ): Promise<ExecuteWorkflowResponseBody> {
    return this._call(`/workflows/${spaceId}/${graphId}`, { ...args, body: input, method: 'POST' });
  }

  public async uploadFunction(
    pathParts: { functionId?: string },
    body: UploadFunctionRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<UploadFunctionResponseBody> {
    const path = ['functions', ...(pathParts.functionId ? [pathParts.functionId] : [])].join('/');
    return this._call(path, { ...args, body, method: 'PUT' });
  }

  public async initiateOAuthFlow(
    body: InitiateOAuthFlowRequest,
    args?: EdgeHttpGetArgs,
  ): Promise<InitiateOAuthFlowResponse> {
    return this._call('/oauth/initiate', { ...args, body, method: 'POST' });
  }

  public async queryQueue(
    subspaceTag: string,
    spaceId: SpaceId,
    query: QueueQuery,
    args?: EdgeHttpGetArgs,
  ): Promise<QueryResult> {
    const { queueId } = query;
    const queryParams = new URLSearchParams();
    if (query.after != null) {
      queryParams.set('after', query.after);
    }
    if (query.before != null) {
      queryParams.set('before', query.before);
    }
    if (query.limit != null) {
      queryParams.set('limit', query.limit.toString());
    }
    if (query.reverse != null) {
      queryParams.set('reverse', query.reverse.toString());
    }
    if (query.objectIds != null) {
      queryParams.set('objectIds', query.objectIds.join(','));
    }
    return this._call(`/spaces/${subspaceTag}/${spaceId}/queue/${queueId}/query?${queryParams.toString()}`, {
      ...args,
      method: 'GET',
    });
  }

  public async insertIntoQueue(
    subspaceTag: string,
    spaceId: SpaceId,
    queueId: ObjectId,
    objects: unknown[],
    args?: EdgeHttpGetArgs,
  ): Promise<void> {
    return this._call(`/spaces/${subspaceTag}/${spaceId}/queue/${queueId}`, {
      ...args,
      body: { objects },
      method: 'POST',
    });
  }

  async deleteFromQueue(
    subspaceTag: string,
    spaceId: SpaceId,
    queueId: ObjectId,
    objectIds: ObjectId[],
    args?: EdgeHttpGetArgs,
  ): Promise<void> {
    return this._call(`/spaces/${subspaceTag}/${spaceId}/queue/${queueId}`, {
      ...args,
      query: { ids: objectIds.join(',') },
      method: 'DELETE',
    });
  }

  async createSpace(body: CreateSpaceRequest, args?: EdgeHttpGetArgs): Promise<CreateSpaceResponseBody> {
    return this._call('/spaces/create', { ...args, body, method: 'POST' });
  }

  private async _call<T>(path: string, args: EdgeHttpCallArgs): Promise<T> {
    const requestContext = args.context ?? new Context();
    const shouldRetry = createRetryHandler(args);
    let url = `${this._baseUrl}${path.startsWith('/') ? path.slice(1) : path}`;

    if (args.query) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(args.query)) {
        queryParams.set(key, value.toString());
      }
      url += `?${queryParams.toString()}`;
    }

    log('call', { method: args.method, path, request: args.body });

    let handledAuth = false;
    let authHeader = this._authHeader;
    while (true) {
      let processingError: EdgeCallFailedError;
      let retryAfterHeaderValue: number = Number.NaN;
      try {
        const request = createRequest(args, authHeader);
        const response = await fetch(url, request);

        retryAfterHeaderValue = Number(response.headers.get('Retry-After'));

        if (response.ok) {
          const body = (await response.json()) as EdgeHttpResponse<T>;
          if (body.success) {
            return body.data;
          }

          log('unsuccessful edge response', { path, body });

          if (body.errorData?.type === 'auth_challenge' && typeof body.errorData?.challenge === 'string') {
            processingError = new EdgeAuthChallengeError(body.errorData.challenge, body.errorData);
          } else {
            processingError = EdgeCallFailedError.fromUnsuccessfulResponse(response, body);
          }
        } else if (response.status === 401 && !handledAuth) {
          authHeader = await this._handleUnauthorized(response);
          handledAuth = true;
          continue;
        } else {
          processingError = EdgeCallFailedError.fromHttpFailure(response);
        }
      } catch (error: any) {
        processingError = EdgeCallFailedError.fromProcessingFailureCause(error);
      }

      if (processingError.isRetryable && (await shouldRetry(requestContext, retryAfterHeaderValue))) {
        log('retrying edge request', { path, processingError });
      } else {
        throw processingError;
      }
    }
  }

  private async _handleUnauthorized(response: Response): Promise<string> {
    if (!this._edgeIdentity) {
      log.warn('edge unauthorized response received before identity was set');
      throw EdgeCallFailedError.fromHttpFailure(response);
    }
    const challenge = await handleAuthChallenge(response, this._edgeIdentity);
    this._authHeader = encodeAuthHeader(challenge);
    log('auth header updated');
    return this._authHeader;
  }
}

const createRetryHandler = (args: EdgeHttpCallArgs) => {
  if (!args.retry || args.retry.count < 1) {
    return async () => false;
  }
  let retries = 0;
  const maxRetries = args.retry.count ?? DEFAULT_MAX_RETRIES_COUNT;
  const baseTimeout = args.retry.timeout ?? DEFAULT_RETRY_TIMEOUT;
  const jitter = args.retry.jitter ?? DEFAULT_RETRY_JITTER;
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

export type EdgeHttpGetArgs = { context?: Context; retry?: RetryConfig };

export type EdgeHttpPostArgs = { context?: Context; body?: any; retry?: RetryConfig };

type EdgeHttpCallArgs = {
  method: string;
  body?: any;
  context?: Context;
  retry?: RetryConfig;
  query?: Record<string, string>;
};

const createRequest = (args: EdgeHttpCallArgs, authHeader: string | undefined): RequestInit => {
  return {
    method: args.method,
    body: args.body && JSON.stringify(args.body),
    headers: authHeader ? { Authorization: authHeader } : undefined,
  };
};

const encodeAuthHeader = (challenge: Uint8Array) => {
  const encodedChallenge = Buffer.from(challenge).toString('base64');
  return `VerifiablePresentation pb;base64,${encodedChallenge}`;
};
