//
// Copyright 2024 DXOS.org
//

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

export class EdgeCallFailedError extends Error {
  public static fromProcessingFailureCause(cause: Error) {
    return new EdgeCallFailedError('Error processing request.', undefined, cause);
  }

  public static fromFailureResponse(response: { status: number; statusText: string }) {
    return new EdgeCallFailedError(`HTTP code ${response.status}: ${response.statusText}.`);
  }

  constructor(
    readonly reason: string,
    readonly errorData?: EdgeErrorData,
    cause?: Error,
  ) {
    super(reason, { cause });
  }
}
