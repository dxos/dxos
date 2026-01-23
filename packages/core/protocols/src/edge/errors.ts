//
// Copyright 2025 DXOS.org
//

import { type EdgeErrorData, type EdgeFailure, EdgeHttpErrorCodec, ErrorCodec } from './edge.js';

// TODO(burdon): Reconcile with @dxos/errors.
/**
 * Error thrown when a call to the Edge service fails.
 * There 3 possible sources of failure:
 * 1. EdgeFailure (JSON body with { success: false }) -> Processing the request failed and was gracefully handled by EDGE service.
 * 2. Http failure (non-ok code) -> The HTTP request failed (e.g. timeout, network error).
 *                               -> Unhandled exception on EDGE side, EDGE would provide serialized error in the response body.
 * 3. Processing failure -> Unhandled exception on client side while processing the response.
 */
export class EdgeCallFailedError extends Error {
  public static fromUnsuccessfulResponse(response: Response, body: EdgeFailure): EdgeCallFailedError {
    const error = new EdgeCallFailedError({
      message: body.message,
      data: body.data,
      isRetryable: body.data == null && response.headers.has('Retry-After'),
      retryAfterMs: getRetryAfterMillis(response),
      cause: body.error ? ErrorCodec.decode(body.error) : undefined,
    });

    return error;
  }

  public static async fromHttpFailure(response: Response): Promise<EdgeCallFailedError> {
    return new EdgeCallFailedError({
      message: `HTTP code ${response.status}: ${response.statusText}.`,
      isRetryable: isRetryableCode(response.status),
      retryAfterMs: getRetryAfterMillis(response),
      cause: await EdgeHttpErrorCodec.decode(response),
    });
  }

  public static fromProcessingFailureCause(cause: Error): EdgeCallFailedError {
    return new EdgeCallFailedError({
      message: 'Error processing request.',
      isRetryable: true,
      cause,
    });
  }

  readonly data?: EdgeErrorData;
  readonly isRetryable?: boolean;
  readonly retryAfterMs?: number;

  constructor(args: {
    message: string;
    isRetryable?: boolean;
    data?: EdgeErrorData;
    retryAfterMs?: number;
    cause?: Error;
  }) {
    super(args.message, { cause: args.cause });
    this.message = args.message;
    this.data = args.data;
    this.retryAfterMs = args.retryAfterMs;
    this.isRetryable = Boolean(args.isRetryable);
  }
}

export class EdgeAuthChallengeError extends EdgeCallFailedError {
  constructor(
    public readonly challenge: string,
    data: EdgeErrorData,
  ) {
    super({ message: 'Auth challenge.', data, isRetryable: false });
  }
}

const getRetryAfterMillis = (response: Response) => {
  const retryAfter = Number(response.headers.get('Retry-After'));
  return Number.isNaN(retryAfter) || retryAfter === 0 ? undefined : retryAfter * 1000;
};

const isRetryableCode = (status: number) => {
  if (status === 501) {
    // Not Implemented
    return false;
  }
  return !(status >= 400 && status < 500);
};
