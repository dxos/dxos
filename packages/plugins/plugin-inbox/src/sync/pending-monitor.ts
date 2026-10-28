//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { type Mailbox } from '#types';

import { createSyncLabel, createSyncProgressKey } from './mail-sync.ts';

/**
 * How long a pending sync meter waits for the run's first progress update before clearing itself:
 * just past EDGE's 60s invocation deadline, by which time a live run has reported or been killed.
 */
export const PENDING_SYNC_TIMEOUT_MS = 70_000;

/** Error a pending sync meter shows when no run took it over in time. */
export const PENDING_SYNC_TIMEOUT_ERROR = 'Timed out: sync reported no progress';

/**
 * Runs `sync` with the mailbox's sync meter showing from the moment sync is requested.
 *
 * The run registers the meter itself, but only when its first progress update reaches this client,
 * which for a run on EDGE is a round trip later. The run's own registration replaces this pending
 * entry under the same key; a superseded handle's `fail`/`remove` touch nothing, so the two never
 * fight. A meter the run never takes over fails {@link PENDING_SYNC_TIMEOUT_MS} after the request ends,
 * and stays until dismissed, so a sync that never started reads as an error rather than silently vanishing.
 */
export const withPendingSyncMonitor = <A, E, R>(
  mailbox: Mailbox.Mailbox,
  registry: AppCapabilities.ProgressRegistry | undefined,
  sync: Effect.Effect<A, E, R>,
  { timeoutMs = PENDING_SYNC_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    if (!registry) {
      return yield* sync;
    }

    // Registering over a run that is already reporting would reset its count.
    const key = createSyncProgressKey(mailbox);
    if (registry.snapshot().tasks.some((task) => task.name === key && task.status === 'running')) {
      return yield* sync;
    }

    const handle = registry.register(key, { label: createSyncLabel(mailbox) });
    const result = yield* sync.pipe(
      Effect.tapError((error) =>
        Effect.sync(() => handle.fail(error instanceof Error ? error.message : String(error))),
      ),
      // An abandoned request reaches neither branch below, and its meter would otherwise spin forever.
      Effect.onInterrupt(() => Effect.sync(() => handle.remove())),
    );

    // Timed from the end of the request, not the click: a request still in flight (a routine form left
    // open) is not a run that failed to report, and failing it would re-enable Sync mid-request.
    yield* Effect.sleep(timeoutMs).pipe(
      Effect.andThen(
        Effect.sync(() => {
          // A superseded handle's `fail` touches nothing, so a run that took over is left alone.
          if (registry.snapshot().tasks.some((task) => task.name === key && task.status === 'running')) {
            handle.fail(PENDING_SYNC_TIMEOUT_ERROR);
          }
        }),
      ),
      Effect.forkDetach,
    );

    return result;
  });
