//
// Copyright 2025 DXOS.org
//

import { type EdgeErrorData, type EdgeFailure, EdgeHttpErrorCodec, ErrorCodec } from './edge';

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
      reason: body.reason,
      errorData: body.errorData,
      isRetryable: body.errorData == null && response.headers.has('Retry-After'),
      retryAfterMs: getRetryAfterMillis(response),
      cause: body.cause ? ErrorCodec.decode(body.cause) : undefined,
    });

    return error;
  }

  public static async fromHttpFailure(response: Response): Promise<EdgeCallFailedError> {
    return new EdgeCallFailedError({
      reason: `HTTP code ${response.status}: ${response.statusText}.`,
      isRetryable: isRetryableCode(response.status),
      retryAfterMs: getRetryAfterMillis(response),
      cause: await EdgeHttpErrorCodec.decode(response),
    });
  }

  public static fromProcessingFailureCause(cause: Error): EdgeCallFailedError {
    return new EdgeCallFailedError({
      reason: 'Error processing request.',
      isRetryable: true,
      cause,
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

const getRetryAfterMillis = (response: Response) => {
  // Note: It is inconsistent with HTTP spec to use Retry-After for responses with status code 200.
  //       However, Edge service does it, and it is hard to change because fixing it will break compatibility between Edge service and clients.
  // Example:
  //       Response({
  //         status: 200, // This is not compliant with HTTP spec.
  //         headers: { 'Retry-After': '3600' },
  //         body: {
  //           "success": false,
  //           "reason": "Auth challenge.",
  //         },
  //       })
  // TODO(mykola): We should store retry delay in the response body instead of the header for Responses with status code 200.
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
