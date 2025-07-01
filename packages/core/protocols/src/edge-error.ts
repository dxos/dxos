//
// Copyright 2025 DXOS.org
//

import { type EdgeErrorData, type EdgeHttpFailure } from './edge';

export class EdgeCallFailedError extends Error {
  public static fromProcessingFailureCause(cause: Error): EdgeCallFailedError {
    return new EdgeCallFailedError({
      reason: 'Error processing request.',
      isRetryable: true,
      cause,
    });
  }

  public static fromHttpFailure(response: Response): EdgeCallFailedError {
    return new EdgeCallFailedError({
      reason: `HTTP code ${response.status}: ${response.statusText}.`,
      isRetryable: isRetryableCode(response.status),
      retryAfterMs: getRetryAfterMillis(response),
    });
  }

  public static fromUnsuccessfulResponse(response: Response, body: EdgeHttpFailure): EdgeCallFailedError {
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
