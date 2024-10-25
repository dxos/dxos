//
// Copyright 2024 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

export enum EdgeService {
  AUTOMERGE_REPLICATOR = 'automerge-replicator',
  FEED_REPLICATOR = 'feed-replicator',
  SWARM_SERVICE_ID = 'swarm',
  SIGNAL_SERVICE_ID = 'signal',
}

export type EdgeHttpSuccess<T> = {
  success: true;
  data: T;
};

export type EdgeErrorData = { type: string } & Record<string, any>;

export type EdgeHttpFailure = {
  success: false;
  /**
   * An explanation of why the call failed. Used mostly for logging and monitoring.
   */
  reason: string;
  /**
   * Information that can be used to retry the request such that it will succeed, for example:
   * 1. { type: 'auth_required', challenge: string }
   *    Requires retrying the request with challenge signature included.
   * 2. { type: 'user_confirmation_required', dialog: { title: string, message: string, confirmation_payload: string } }
   *    Requires showing a confirmation dialog to a user and retrying the request with confirmation_payload included
   *    if the user confirms.
   * When errorData is returned simply retrying the request won't have any effect.
   * EdgeHttpClient should parse well-known errorData into Error types and throw.
   */
  errorData?: EdgeErrorData;
};

export type EdgeHttpResponse<T> = EdgeHttpSuccess<T> | EdgeHttpFailure;

export type GetNotarizationResponseBody = {
  awaitingNotarization: { credentials: string[] };
};

export type PostNotarizationRequestBody = {
  credentials: string[];
};

export type JoinSpaceRequest = {
  invitationId: string;
  identityKey: string;
  /**
   * Base64 encoded signed challenge.
   * Used to verify the IdentityKey in case of `invitation.authMethod === Invitation.AuthMethod.KNOWN_PUBLIC_KEY`
   */
  signature?: string;
};

export type JoinSpaceResponseBody = {
  spaceMemberCredential: string;
  spaceGenesisFeedKey: string;
};

export type RecoverIdentityRequest = {
  recoveryKey: string;
  deviceKey: string;
  controlFeedKey: string;
  signature?: string;
};

export type RecoverIdentityResponseBody = {
  identityKey: string;
  haloSpaceKey: string;
  genesisFeedKey: string;
  deviceAuthCredential: string;
};

export type CreateAgentRequestBody = {
  identityKey: string;
  haloSpaceId: SpaceId;
  haloSpaceKey: string;
};

export type CreateAgentResponseBody = {
  deviceKey: string;
  feedKey: string;
};

export type GetAgentStatusResponseBody = {
  agent: {
    deviceKey?: string;
    status: EdgeAgentStatus;
  };
};

export enum EdgeAgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  NOT_FOUND = 'not_found',
}

export class EdgeCallFailedError extends Error {
  public static fromProcessingFailureCause(cause: Error) {
    return new EdgeCallFailedError({
      reason: 'Error processing request.',
      isRetryable: true,
      cause,
    });
  }

  public static fromHttpFailure(response: Response) {
    return new EdgeCallFailedError({
      reason: `HTTP code ${response.status}: ${response.statusText}.`,
      isRetryable: isRetryableCode(response.status),
      retryAfterMs: getRetryAfterMillis(response),
    });
  }

  public static fromUnsuccessfulResponse(response: Response, body: EdgeHttpFailure) {
    return new EdgeCallFailedError({
      reason: body.reason,
      errorData: body.errorData,
      isRetryable: body.errorData == null && response.headers.has('Retry-After'),
      retryAfterMs: getRetryAfterMillis(response),
    });
  }

  readonly reason: string;
  readonly errorData?: EdgeErrorData;
  readonly isRetryable?: boolean;
  readonly retryAfterMs?: number;

  constructor(args: {
    reason: string;
    isRetryable?: boolean;
    errorData?: EdgeErrorData;
    retryAfterMs?: number;
    cause?: Error;
  }) {
    super(args.reason, { cause: args.cause });
    this.reason = args.reason;
    this.errorData = args.errorData;
    this.retryAfterMs = args.retryAfterMs;
    this.isRetryable = Boolean(args.isRetryable);
  }
}

export class EdgeAuthChallengeError extends EdgeCallFailedError {
  constructor(
    public readonly challenge: string,
    errorData: EdgeErrorData,
  ) {
    super({ reason: 'Auth challenge.', errorData, isRetryable: false });
  }
}

export type EdgeAuthChallenge = {
  type: 'auth_challenge';
  challenge: string;
};

const getRetryAfterMillis = (response: Response) => {
  const retryAfter = Number(response.headers.get('Retry-After'));
  return Number.isNaN(retryAfter) || retryAfter === 0 ? undefined : retryAfter * 1000;
};

export const createRetryableHttpFailure = (args: { reason: any; retryAfterSeconds: number }) => {
  return new Response(JSON.stringify({ success: false, reason: args.reason }), {
    headers: { 'Retry-After': String(args.retryAfterSeconds) },
  });
};

const isRetryableCode = (status: number) => {
  if (status === 501) {
    // Not Implemented
    return false;
  }
  return !(status >= 400 && status < 500);
};
