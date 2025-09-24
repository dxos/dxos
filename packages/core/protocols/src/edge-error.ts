//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

import { type EdgeErrorData, type EdgeHttpFailure } from './edge';

// TODO(burdon): Reconcile with @dxos/errors.
export class EdgeCallFailedError extends Error {
  public static fromProcessingFailureCause(cause: Error): EdgeCallFailedError {
    return new EdgeCallFailedError({
      reason: 'Error processing request.',
      isRetryable: true,
      cause,
    });
  }

  public static async fromHttpFailure(response: Response): Promise<EdgeCallFailedError> {
    return new EdgeCallFailedError({
      reason: `HTTP code ${response.status}: ${response.statusText}.`,
      isRetryable: isRetryableCode(response.status),
      retryAfterMs: getRetryAfterMillis(response),
      cause: await parseErrorBody(response),
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

const parseErrorBody = async (response: Response): Promise<Error | undefined> => {
  if (response.headers.get('Content-Type') !== 'application/json') {
    const body = await response.text();
    return new Error(body.slice(0, 256));
  }

  const body = await response.json();
  if (!('error' in body)) {
    return undefined;
  }

  return parseSerializedError(body.error);
};

type SerializedError = {
  code?: string;
  message?: string;
  context?: Record<string, unknown>;
  stack?: string;
  cause?: SerializedError;
};

const parseSerializedError = (serializedError: SerializedError): Error => {
  let err: Error;
  if (typeof serializedError.code === 'string') {
    err = new BaseError(serializedError.code, {
      message: serializedError.message ?? 'Unknown error',
      cause: serializedError.cause ? parseSerializedError(serializedError.cause) : undefined,
      context: serializedError.context,
    });

    if (serializedError.stack) {
      Object.defineProperty(err, 'stack', {
        value: serializedError.stack,
      });
    }
  } else {
    err = new Error(serializedError.message ?? 'Unknown error', {
      cause: serializedError.cause ? parseSerializedError(serializedError.cause) : undefined,
    });

    if (serializedError.stack) {
      Object.defineProperty(err, 'stack', {
        value: serializedError.stack,
      });
    }
  }

  return err;
};
