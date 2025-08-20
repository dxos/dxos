//
// Copyright 2025 DXOS.org
//

import { Config, Duration, Effect, Option } from 'effect';

export const withTimeout = Effect.fnUntraced(function* <A, E, R>(effect: Effect.Effect<A, E, R>) {
  const timeout = yield* Config.integer('timeout').pipe(Config.option);
  const duration = timeout.pipe(
    Option.map(Duration.millis),
    Option.getOrElse(() => Duration.infinity),
  );
  return effect.pipe(Effect.timeout(duration));
});
