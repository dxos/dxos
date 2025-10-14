//
// Copyright 2025 DXOS.org
//

import { type HttpClient } from '@effect/platform';
import { type HttpClientError } from '@effect/platform/HttpClientError';
import { type HttpClientResponse } from '@effect/platform/HttpClientResponse';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';

import { log } from '@dxos/log';

// TODO(burdon): Factor out.

export type RetryOptions = {
  timeout: Duration.Duration;
  retryTimes: number;
  retryBaseDelay: Duration.Duration;
};

// Layer pattern.
export class HttpConfig extends Context.Tag('HttpConfig')<HttpConfig, RetryOptions>() {
  static default = Layer.succeed(HttpConfig, {
    timeout: Duration.millis(1_000),
    retryTimes: 3,
    retryBaseDelay: Duration.millis(1_000),
  });
}

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

export const withRetryConfig = (effect: Effect.Effect<HttpClientResponse, HttpClientError, HttpClient.HttpClient>) =>
  Effect.gen(function* () {
    const config = yield* HttpConfig;
    return yield* withRetry(effect, config);
  });

export const withLogging = <A extends HttpClientResponse, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.tap((res) => log.info('response', { status: res.status })));

/**
 *
 */
// TODO(burdon): Document.
export const encodeAuthHeader = (challenge: Uint8Array) => {
  const encodedChallenge = Buffer.from(challenge).toString('base64');
  return `VerifiablePresentation pb;base64,${encodedChallenge}`;
};
