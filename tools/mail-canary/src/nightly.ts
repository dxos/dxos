//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { type SpaceSnapshot, runChecks } from './checks.ts';
import { type Gmail, type GmailError } from './gmail.ts';
import { type NightlyReport } from './report.ts';
import { listSeeded, seedCopies, trashOldCopies } from './seed.ts';

/** Reads the canary space; implemented over `dx eval` in `space.ts`. */
export type SpaceReader<E> = {
  readonly snapshot: (options: { readonly since: number }) => Effect.Effect<SpaceSnapshot, E>;
};

export type NightlyOptions = {
  readonly spaceId: string;
  /** Pool messages to copy into the inbox. */
  readonly count: number;
  /** How long to wait for every copy to reach the mailbox feed. */
  readonly syncTimeout: Duration.Input;
  /** How often to re-read the space while waiting. */
  readonly pollInterval: Duration.Input;
  /** How far back the trace checks look; a day plus an hour, so consecutive nights overlap. */
  readonly window: Duration.Input;
};

/**
 * One nightly run: trash old copies, seed fresh ones, wait for the sync to pick them up, then check
 * the whole window of sync runs and the copies of the last two days.
 */
export const runNightly = <E>(
  gmail: Gmail,
  space: SpaceReader<E>,
  { spaceId, count, syncTimeout, pollInterval, window }: NightlyOptions,
): Effect.Effect<NightlyReport, GmailError | E> =>
  Effect.gen(function* () {
    const startedAt = new Date();
    const since = startedAt.getTime() - Duration.toMillis(window);
    const trashed = yield* trashOldCopies(gmail);
    const { poolSize, seededIds } = yield* seedCopies(gmail, { count, now: startedAt });

    const deadline = startedAt.getTime() + Duration.toMillis(syncTimeout);
    let snapshot = yield* space.snapshot({ since });
    let syncMinutes: number | undefined;
    while (true) {
      const synced = new Set(snapshot.messages.map((message) => message.gmailId));
      if (seededIds.every((id) => synced.has(id))) {
        syncMinutes = Math.round((Date.now() - startedAt.getTime()) / 60_000);
        break;
      }
      if (Date.now() >= deadline) {
        break;
      }
      yield* Effect.sleep(pollInterval);
      snapshot = yield* space.snapshot({ since });
    }

    const seeded = yield* listSeeded(gmail);
    const report = runChecks(snapshot, seeded, { now: Date.now(), since });
    return {
      ...report,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      spaceId,
      seeded: seededIds.length,
      trashed,
      poolSize,
      syncMinutes,
    };
  });
