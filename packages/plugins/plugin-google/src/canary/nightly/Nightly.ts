//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { type SpaceSnapshot, runChecks } from '../checks/index.ts';
import { type CanaryError } from '../errors.ts';
import { type CanaryMailboxError } from '../gmail/index.ts';
import { type Seeder } from '../seed/index.ts';
import { type CanarySpace } from '../space/index.ts';
import { type NightlyReport } from './report.ts';

export type NightlyOptions = {
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
 * One nightly run: rotate the oldest pool messages into fresh copies, wait for the sync to pick them
 * up, then check the whole window of sync runs and tonight's copies.
 */
export class Nightly {
  readonly #seeder: Pick<Seeder, 'rotate'>;
  readonly #space: Pick<CanarySpace, 'spaceId' | 'snapshot'>;

  constructor({ seeder, space }: { seeder: Pick<Seeder, 'rotate'>; space: Pick<CanarySpace, 'spaceId' | 'snapshot'> }) {
    this.#seeder = seeder;
    this.#space = space;
  }

  run({
    count,
    syncTimeout,
    pollInterval,
    window,
  }: NightlyOptions): Effect.Effect<NightlyReport, CanaryMailboxError | CanaryError> {
    return Effect.gen({ self: this }, function* () {
      const startedAt = new Date();
      const since = startedAt.getTime() - Duration.toMillis(window);
      const { poolSize, seeded, trashed } = yield* this.#seeder.rotate({ count, now: startedAt });
      const seededIds = seeded.map((message) => message.gmailId);

      const deadline = startedAt.getTime() + Duration.toMillis(syncTimeout);
      let snapshot: SpaceSnapshot = yield* this.#space.snapshot();
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
        snapshot = yield* this.#space.snapshot();
      }

      const report = runChecks(snapshot, seeded, { now: Date.now(), since });
      return {
        ...report,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        spaceId: this.#space.spaceId,
        seeded: seededIds.length,
        trashed,
        poolSize,
        syncMinutes,
      };
    });
  }
}
