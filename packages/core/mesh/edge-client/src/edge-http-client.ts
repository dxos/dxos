//
// Copyright 2024 DXOS.org
//

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { EdgeCallFailedError, type EdgeHttpResponse } from '@dxos/protocols';

const DEFAULT_RETRY_JITTER = 500;
const DEFAULT_MAX_RETRIES_COUNT = 3;

export class EdgeHttpClient {
  private readonly _baseUrl: string;

  constructor(baseUrl: string) {
    const url = new URL(baseUrl);
    url.protocol = 'https';
    this._baseUrl = url.toString();
  }

  public get<T>(path: string, args?: EdgeHttpGetArgs): Promise<T> {
    return this._call(path, { ...args, method: 'GET' });
  }

  public post<T>(path: string, args?: EdgeHttpPostArgs): Promise<T> {
    return this._call(path, { ...args, method: 'POST' });
  }

  private async _call<T>(path: string, args: EdgeHttpCallArgs): Promise<T> {
    const requestContext = args.context ?? new Context();
    const shouldRetry = createRetryHandler(args);
    const request = createRequest(args);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    while (true) {
      let processingError: EdgeCallFailedError;
      let retryAfterHeaderValue: number = Number.NaN;
      try {
        const response = await fetch(`${this._baseUrl}${normalizedPath}`, request);

        retryAfterHeaderValue = Number(response.headers.get('Retry-After'));

        if (response.ok) {
          const body = (await response.json()) as EdgeHttpResponse<T>;
          if (body.success) {
            return body.data;
          }

          const isNonRetryable = body.errorData != null;
          if (isNonRetryable) {
            throw new EdgeCallFailedError(body.reason, body.errorData);
          }

          processingError = new EdgeCallFailedError(body.reason);
        } else {
          processingError = EdgeCallFailedError.fromFailureResponse(response);
          if (!isRetryable(response.status)) {
            throw processingError;
          }
        }
      } catch (error: any) {
        processingError = EdgeCallFailedError.fromProcessingFailureCause(error);
      }

      if (await shouldRetry(requestContext, retryAfterHeaderValue)) {
        log.info('retrying edge request', { path, processingError });
      } else {
        throw processingError;
      }
    }
  }
}

const createRequest = (args: EdgeHttpCallArgs): RequestInit => {
  return {
    method: args.method,
    body: args.body && JSON.stringify(args.body),
  };
};

const isRetryable = (status: number) => {
  if (status === 501) {
    // Not Implemented
    return false;
  }
  // TODO: handle 401 Not Authorized
  return !(status >= 400 && status < 500);
};

const createRetryHandler = (args: EdgeHttpCallArgs) => {
  if (!args.retry || args.retry.count < 1) {
    return async () => false;
  }
  let retries = 0;
  const maxRetries = args.retry.count ?? DEFAULT_MAX_RETRIES_COUNT;
  const baseTimeout = args.retry.timeout ?? DEFAULT_MAX_RETRIES_COUNT;
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
};
