//
// Copyright 2025 DXOS.org
//

import { Config, type ConfigError, Duration, Effect, Option } from 'effect';
import type { TimeoutException } from 'effect/Cause';

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
