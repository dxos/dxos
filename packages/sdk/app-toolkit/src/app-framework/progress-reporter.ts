//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';

import { STATUS_CANCELLED, STATUS_COMPLETE, STATUS_FAILED } from './progress-trace-sink.ts';

/**
 * Progress-registry key for a target's sync: its absolute URI plus `#sync`. Absolute, because the operation
 * that reports and the surface that shows the meter derive the key independently.
 */
export const createSyncKey = (target: Obj.Unknown): string =>
  Obj.getURI(target, { prefer: 'absolute' }).toString() + '#sync';

/**
 * Reports one run's progress as `Trace.StatusUpdate` events, which the progress trace sink projects into a
 * meter. A run reports its total once the work is known, advances as items are done, and ends with
 * {@link ProgressReporter.end} (or `complete` / `fail`).
 */
export type ProgressReporter = {
  /** The run's total, once known. Never set below the count already reported. */
  readonly total: (total: number) => void;
  /** Counts `count` more items done (one by default). A count past the total raises the total with it. */
  readonly advance: (count?: number) => void;
  readonly complete: () => void;
  readonly fail: () => void;
  /** Ends the meter with the run's outcome: complete on success, cancelled on interruption, failed otherwise. */
  readonly end: (exit: Exit.Exit<unknown, unknown>) => void;
};

/**
 * Starts a meter for one run and returns its {@link ProgressReporter}. The meter shows `label` from the first
 * update, indeterminate until the run reports a total.
 */
export const makeReporter = (
  writer: Trace.Writer,
  { key, label }: { key: string; label: string },
): ProgressReporter => {
  let current = 0;
  let total: number | undefined;
  const update = () => writer.write(Trace.StatusUpdate, { message: label, progress: { key, current, total } });
  const terminal = (message: string) => writer.write(Trace.StatusUpdate, { message, progress: { key } });
  update();

  const complete = () => terminal(STATUS_COMPLETE);
  const fail = () => terminal(STATUS_FAILED);
  return {
    total: (count) => {
      total = Math.max(count, current);
      update();
    },
    advance: (count = 1) => {
      current += count;
      if (total !== undefined && current > total) {
        total = current;
      }
      update();
    },
    complete,
    fail,
    end: (exit) => {
      if (Exit.isSuccess(exit)) {
        complete();
      } else if (Exit.hasInterrupts(exit)) {
        terminal(STATUS_CANCELLED);
      } else {
        fail();
      }
    },
  };
};

/**
 * Runs `effect` with a meter: starts a {@link ProgressReporter} from the ambient `Trace.TraceService`, hands it
 * to `effect`, and ends it with the outcome.
 */
export const withReporter = Effect.fnUntraced(function* <A, E, R>(
  options: { key: string; label: string },
  effect: (reporter: ProgressReporter) => Effect.Effect<A, E, R>,
) {
  const reporter = makeReporter(yield* Trace.TraceService, options);
  return yield* effect(reporter).pipe(Effect.onExit((exit) => Effect.sync(() => reporter.end(exit))));
});
