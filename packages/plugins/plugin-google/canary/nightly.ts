//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import * as MailSync from '@dxos/plugin-inbox/MailSync';

import { type Report, type SeededMessage, type SpaceSnapshot, runChecks } from './checks.ts';
import { CanaryError, type CanaryMailbox, type MailboxError, POOL_LABEL } from './mailbox.ts';
import { type CanarySpace } from './space.ts';

/** Everything one nightly run produced; written to disk before the test asserts. */
export type NightlyReport = Report & {
  readonly startedAt: string;
  readonly spaceId: string;
  readonly seeded: number;
  readonly poolSize: number;
  /** Minutes until every copy was in the mailbox feed; absent when they never all arrived. */
  readonly syncMinutes?: number;
};

export type NightlyOptions = {
  /** Pool messages to rotate into fresh copies. */
  readonly count: number;
  /** How long to wait for every copy to reach the mailbox feed. */
  readonly syncTimeout: Duration.Input;
  readonly pollInterval: Duration.Input;
  /** How far back the trace checks look; over a day, so consecutive nights overlap. */
  readonly window: Duration.Input;
};

/** The Gmail calls a run makes. */
export type NightlyMailbox = Pick<
  CanaryMailbox,
  'ensureLabel' | 'listIds' | 'getRaw' | 'insert' | 'trash' | 'getHeaders'
>;

// Gmail allows 250 quota units per user per second; an insert costs 25.
const WRITE_CONCURRENCY = 4;

/**
 * One nightly run. It rotates the oldest pool messages into copies dated now (inserted before their
 * originals are trashed, so a failed night never shrinks the pool), waits for the space's own sync to
 * pick them up, then checks the whole window of sync runs and tonight's copies.
 */
export class Nightly {
  readonly #mailbox: NightlyMailbox;
  readonly #space: Pick<CanarySpace, 'spaceId' | 'snapshot'>;

  constructor(mailbox: NightlyMailbox, space: Pick<CanarySpace, 'spaceId' | 'snapshot'>) {
    this.#mailbox = mailbox;
    this.#space = space;
  }

  run({ count, syncTimeout, pollInterval, window }: NightlyOptions): Effect.Effect<NightlyReport, MailboxError> {
    return Effect.gen({ self: this }, function* () {
      const startedAt = new Date();
      const { poolSize, seeded } = yield* this.rotate(count, startedAt);

      const deadline = startedAt.getTime() + Duration.toMillis(syncTimeout);
      let snapshot: SpaceSnapshot = yield* this.#space.snapshot();
      let syncMinutes: number | undefined;
      while (true) {
        const synced = new Set(snapshot.messages.map((message) => message.gmailId));
        if (seeded.every((message) => synced.has(message.gmailId))) {
          syncMinutes = Math.round((Date.now() - startedAt.getTime()) / 60_000);
          break;
        }
        if (Date.now() >= deadline) {
          break;
        }
        yield* Effect.sleep(pollInterval);
        snapshot = yield* this.#space.snapshot();
      }

      const now = Date.now();
      const report = runChecks(snapshot, seeded, { now, since: now - Duration.toMillis(window) });
      return {
        ...report,
        startedAt: startedAt.toISOString(),
        spaceId: this.#space.spaceId,
        seeded: seeded.length,
        poolSize,
        syncMinutes,
      };
    });
  }

  /** Copies the `count` oldest pool messages into the inbox as new mail and trashes the originals. */
  rotate(count: number, now: Date): Effect.Effect<{ poolSize: number; seeded: SeededMessage[] }, MailboxError> {
    return Effect.gen({ self: this }, function* () {
      // `slice(-count)` takes the whole pool for 0 or NaN, and a short pool would seed too few copies to judge.
      const pool = Number.isInteger(count) && count > 0 ? yield* this.#mailbox.listIds(`label:${POOL_LABEL}`) : [];
      if (pool.length < count || pool.length === 0) {
        return yield* new CanaryError({ message: `cannot rotate ${count} of a pool of ${pool.length}` });
      }
      const label = yield* this.#mailbox.ensureLabel(POOL_LABEL);
      // Gmail lists newest first, so the oldest pool messages are at the end.
      const seeded = yield* Effect.forEach(
        pool.slice(-count),
        (poolId) =>
          Effect.gen({ self: this }, function* () {
            const id = yield* this.#mailbox.insert(makeSeedCopy(yield* this.#mailbox.getRaw(poolId), poolId, now), [
              'INBOX',
              label,
            ]);
            yield* this.#mailbox.trash(poolId);
            const { headers } = yield* this.#mailbox.getHeaders(id, ['Subject', 'From']);
            return {
              gmailId: id,
              subject: headers.Subject,
              sender: headers.From && MailSync.parseFromHeader(headers.From)?.email,
            };
          }),
        { concurrency: WRITE_CONCURRENCY },
      );
      return { poolSize: pool.length, seeded };
    });
  }
}

const DROPPED_HEADER = /^(date|message-id|bcc|x-dx-seed):/i;

/**
 * A fresh copy of a pool message: new `Date` and `Message-ID` (Gmail may drop an insert whose id it has
 * seen) and an `X-Dx-Seed` header naming the original; `Bcc` is dropped and the body left byte for byte.
 */
export const makeSeedCopy = (message: string, poolId: string, now: Date): string => {
  const end = /\r?\n\r?\n/.exec(message);
  const head = end ? message.slice(0, end.index) : message;
  // A header's folded continuation lines start with whitespace, so splitting before any other line keeps them.
  const kept = head.split(/\r?\n(?![ \t])/).filter((header) => !DROPPED_HEADER.test(header));
  const added = [
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${poolId}.${now.getTime()}@canary.dxos.org>`,
    `X-Dx-Seed: ${poolId}`,
  ];
  return [...added, ...kept].join(head.includes('\r\n') ? '\r\n' : '\n') + (end ? message.slice(end.index) : '');
};

/** Flat properties for the `ci.mail-canary` PostHog event: no nesting, no message content. */
export const toEventProperties = (report: NightlyReport): Record<string, string | number | boolean> => ({
  ok: report.ok,
  failedChecks: report.checks.flatMap((check) => (check.ok ? [] : [check.id])).join(','),
  failureClasses: [...new Set(report.checks.flatMap((check) => check.failures.map((failure) => failure.class)))]
    .sort()
    .join(','),
  seeded: report.seeded,
  poolSize: report.poolSize,
  syncMinutes: report.syncMinutes ?? -1,
  ...report.runs,
});

/** The report as Markdown for the job summary: the verdict, the checks, then up to 50 failures. */
export const renderSummary = (report: NightlyReport): string => {
  const failures = report.checks.flatMap((check) => check.failures.map((failure) => ({ check: check.id, ...failure })));
  const arrived = report.syncMinutes === undefined ? 'never all arrived' : `all arrived in ${report.syncMinutes} min`;
  return [
    `## Mail canary: ${report.ok ? 'passed' : 'FAILED'}`,
    '',
    `Space \`${report.spaceId}\`, ${report.startedAt}: seeded ${report.seeded} of ${report.poolSize}; the copies ${arrived}.`,
    `Sync runs: ${report.runs.runs} (${report.runs.invocations} invocations, ${report.runs.failed} failed).`,
    '',
    '| Check | Result | Failures |',
    '| --- | --- | --- |',
    ...report.checks.map(
      (check) => `| ${check.id} ${check.name} | ${check.ok ? 'pass' : 'FAIL'} | ${check.failures.length} |`,
    ),
    ...(failures.length > 0 ? ['', '| Check | Class | Run or message | Detail |', '| --- | --- | --- | --- |'] : []),
    ...failures
      .slice(0, 50)
      .map(
        (failure) =>
          `| ${failure.check} | ${failure.class} | ${failure.pid ?? failure.gmailId ?? ''} | ${failure.message.replace(/\s+/g, ' ').slice(0, 300).replaceAll('|', '\\|')} |`,
      ),
    '',
  ].join('\n');
};
