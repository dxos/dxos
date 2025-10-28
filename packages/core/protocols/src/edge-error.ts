//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

import { type EdgeErrorData, type EdgeFailure } from './edge';

// TODO(burdon): Reconcile with @dxos/errors.
/**
 * Error thrown when a call to the Edge service fails.
 * There 3 possible sources of failure:
 * 1. EdgeFailure -> Processing the request failed and was gracefully handled by EDGE service.
 * 2. Http failure (non-ok code) -> The HTTP request failed (e.g. timeout, network error).
 *                               -> Unhandled exception on EDGE side, EDGE would provide serialized error in the response body.
 * 3. Processing failure -> Unhandled exception on client side while processing the response.
 */
export class EdgeCallFailedError extends Error {
  public static fromUnsuccessfulResponse(response: Response, body: EdgeFailure): EdgeCallFailedError {
    return new EdgeCallFailedError({
      reason: body.reason,
      errorData: body.errorData,
      isRetryable: body.errorData == null && response.headers.has('Retry-After'),
      retryAfterMs: getRetryAfterMillis(response),
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

const parseErrorBody = async (response: Response): Promise<Error | undefined> => {
  if (response.headers.get('Content-Type') !== 'application/json') {
    const body = await response.text();
    return new Error(body.slice(0, 256));
  }

  const body = await response.json();
  if (!('error' in body)) {
    return undefined;
  }

  return EdgeHttpErrorCodec.deserialize(body.error);
};

type SerializedError = {
  code?: string;
  message?: string;
  context?: Record<string, unknown>;
  stack?: string;
  cause?: SerializedError;
};

/**
 * Codec for serializing and deserializing EDGE unhandled errors.
 * EDGE will return an error object in the response body when an unhandled error occurs with the HTTP status code 500.
 */
export const EdgeHttpErrorCodec = Object.freeze({
  encode: (err: Error): SerializedError => ({
    code: 'code' in err ? (err as any).code : undefined,
    message: err.message,
    stack: err.stack,
    cause: err.cause instanceof Error ? EdgeHttpErrorCodec.encode(err.cause) : undefined,
  }),
  deserialize: (serializedError: SerializedError): Error => {
    let err: Error;
    if (typeof serializedError.code === 'string') {
      err = new BaseError(serializedError.code, {
        message: serializedError.message ?? 'Unknown error',
        cause: serializedError.cause ? EdgeHttpErrorCodec.deserialize(serializedError.cause) : undefined,
        context: serializedError.context,
      });

      if (serializedError.stack) {
        Object.defineProperty(err, 'stack', {
          value: serializedError.stack,
        });
      }
    } else {
      err = new Error(serializedError.message ?? 'Unknown error', {
        cause: serializedError.cause ? EdgeHttpErrorCodec.deserialize(serializedError.cause) : undefined,
      });

      if (serializedError.stack) {
        Object.defineProperty(err, 'stack', {
          value: serializedError.stack,
        });
      }
    }

    return err;
  },
});
