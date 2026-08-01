//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { log } from '@dxos/log';

import * as Progress from './Progress';

/** A destination for progress snapshots — a log line, a file, an app surface, an EDGE stream, … */
export type ProgressSink = (snapshot: Progress.ProgressSnapshot) => Effect.Effect<void>;

/** One compact info-log line per snapshot (works everywhere — node, browser, EDGE). */
export const logSink: ProgressSink = (snapshot) =>
  Effect.sync(() =>
    log.info('progress', {
      tasks: snapshot.tasks.map(
        (task) => `${task.name} ${task.current}${task.total !== undefined ? `/${task.total}` : ''} ${task.status}`,
      ),
    }),
  );

/**
 * A reporter layer: subscribes to the {@link Progress} registry and flushes the latest snapshot to
 * `sink` at most once per `throttle` (coalescing bursts), plus a final flush when the scope closes.
 * Reactive consumers (a browser panel) can instead `Progress.subscribe` directly for instant
 * updates; this layer is for rate-limited sinks (file, log, EDGE).
 */
export const layer = (options: {
  readonly sink: ProgressSink;
  readonly throttle?: Duration.DurationInput;
}): Layer.Layer<never, never, Progress.Progress> =>
  Layer.scopedDiscard(
    Effect.gen(function* () {
      const progress = yield* Progress.Progress;
      const throttle = options.throttle ?? '2 seconds';

      let latest: Progress.ProgressSnapshot | undefined;
      const unsubscribe = progress.subscribe((snapshot) => {
        latest = snapshot;
      });
      yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));

      const flush = Effect.suspend(() => {
        const snapshot = latest;
        latest = undefined;
        return snapshot ? options.sink(snapshot) : Effect.void;
      });

      // Periodic throttled flush while the scope is open; a final flush captures the terminal state.
      yield* Effect.forkScoped(Effect.forever(flush.pipe(Effect.delay(throttle))));
      yield* Effect.addFinalizer(() => options.sink(progress.snapshot()).pipe(Effect.ignore));
    }),
  );
