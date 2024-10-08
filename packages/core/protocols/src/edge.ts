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
  reason: string;
  errorData?: EdgeErrorData;
};

export type EdgeHttpResponse<T> = EdgeHttpSuccess<T> | EdgeHttpFailure;

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
