//
// Copyright 2025 DXOS.org
//

import type { TimeoutException } from 'effect/Cause';
import * as Config from 'effect/Config';
import type * as ConfigError from 'effect/ConfigError';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

export const withTimeout: <A, E, R>(
  effect: Effect.Effect<A, E, R>,
) => Effect.Effect<A, TimeoutException | ConfigError.ConfigError | E, R> = Effect.fnUntraced(function* (effect) {
  const timeout = yield* Config.integer('TIMEOUT').pipe(Config.option);
  const duration = timeout.pipe(
    Option.map(Duration.millis),
    Option.getOrElse(() => Duration.infinity),
  );
  return yield* effect.pipe(Effect.timeout(duration));
});
