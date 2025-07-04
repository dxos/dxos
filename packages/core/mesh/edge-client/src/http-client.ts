//
// Copyright 2025 DXOS.org
//

import { type HttpClient } from '@effect/platform';
import { type HttpClientError } from '@effect/platform/HttpClientError';
import { type HttpClientResponse } from '@effect/platform/HttpClientResponse';
import { Context, Duration, Effect, Layer, Schedule } from 'effect';

import { log } from '@dxos/log';

// TODO(burdon): Factor out.

export type RetryOptions = {
  timeout: Duration.Duration;
  retryTimes: number;
  retryBaseDelay: Duration.Duration;
};

// HOC pattern.
export const withRetry = (
  effect: Effect.Effect<HttpClientResponse, HttpClientError, HttpClient.HttpClient>,
  {
    timeout = Duration.millis(1_000),
    retryBaseDelay = Duration.millis(1_000),
    retryTimes = 3,
  }: Partial<RetryOptions> = {},
) => {
  return effect.pipe(
    Effect.flatMap((res) =>
      // Treat 500 errors as retryable?
      res.status === 500 ? Effect.fail(new Error(res.status.toString())) : res.json,
    ),
    Effect.timeout(timeout),
    Effect.retry({
      schedule: Schedule.exponential(retryBaseDelay).pipe(Schedule.jittered),
      times: retryTimes,
    }),
  );
};

export const withLogging = <A extends HttpClientResponse, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.tap((res) => log.info('response', { status: res.status })));

// Layer pattern.
export class HttpConfig extends Context.Tag('HttpConfig')<HttpConfig, RetryOptions>() {
  static default = Layer.succeed(HttpConfig, {
    timeout: Duration.millis(1_000),
    retryTimes: 3,
    retryBaseDelay: Duration.millis(1_000),
  });
}

export const withRetryConfig = (effect: Effect.Effect<HttpClientResponse, HttpClientError, HttpClient.HttpClient>) =>
  Effect.gen(function* () {
    const config = yield* HttpConfig;
    return yield* withRetry(effect, config);
  });
