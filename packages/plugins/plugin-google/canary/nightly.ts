//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';
import * as MailSync from '@dxos/plugin-inbox/MailSync';

import { splitMbox } from '../scripts/mbox.ts';
import { type ExpectedMessage, type Report, type SpaceSnapshot, runChecks } from './checks.ts';
import { type FullSyncReport } from './full-sync.ts';
import { CanaryError, type CanaryMailbox, type MailboxError, SEED_LABEL } from './mailbox.ts';
import { type CanarySpace } from './space.ts';

/** What stages 1 and 2 produced. */
export type NightlyReport = Report & {
  readonly startedAt: string;
  readonly spaceId: string;
  /** Stage 1: absent when the run did not seed. */
  readonly seed?: {
    readonly seeded: number;
    readonly poolSize: number;
    /** Pool index of tonight's first copy; the next run starts where this one ended. */
    readonly poolStart: number;
    /** Seconds until every copy was in the mailbox feed; absent when they never all arrived. */
    readonly syncSeconds?: number;
  };
};

/** Everything one nightly run produced; written to disk before the test asserts. */
export type CanaryReport = NightlyReport & {
  /** Stage 3: absent when the run skipped it. */
  readonly fullSync?: FullSyncReport;
};

/** Stage 1's work: `count` messages of the Enron pool (one RFC 5322 message per entry, in a fixed order). */
export type SeedOptions = {
  readonly pool: readonly string[];
  readonly count: number;
};

export type NightlyOptions = {
  readonly seed?: SeedOptions;
  /** How long to wait for every copy to reach the mailbox feed. */
  readonly syncTimeout: Duration.Duration;
  readonly pollInterval: Duration.Duration;
  /** How far back the sync failure check looks. */
  readonly window: Duration.Duration;
  /** How long a sync invocation may stay open before it counts as hung. */
  readonly hungAfter: Duration.Duration;
};

/** The Gmail calls a run makes. */
export type NightlyMailbox = Pick<CanaryMailbox, 'ensureLabel' | 'listIds' | 'insert' | 'getHeaders'>;

// Gmail allows 250 quota units per user per second; an insert costs 25.
const WRITE_CONCURRENCY = 4;

/** Names a copy's pool index. */
const SEED_HEADER = 'X-Dx-Seed';
/** The pool index the next run starts at; every copy of a run carries the same one, so any of them is the cursor. */
const NEXT_HEADER = 'X-Dx-Seed-Next';

/**
 * Stages 1 and 2 against the canary space: seed the next pool messages as mail received now, then wait for the space's
 * own sync and check the copies and the window's sync runs. The pool stays out of Gmail, since the sync takes every
 * message added to the account.
 */
export class Nightly {
  readonly #mailbox: NightlyMailbox;
  readonly #space: Pick<CanarySpace, 'spaceId' | 'snapshot' | 'runSync'>;

  constructor(mailbox: NightlyMailbox, space: Pick<CanarySpace, 'spaceId' | 'snapshot' | 'runSync'>) {
    this.#mailbox = mailbox;
    this.#space = space;
  }

  run({
    seed,
    syncTimeout,
    pollInterval,
    window,
    hungAfter,
  }: NightlyOptions): Effect.Effect<NightlyReport, MailboxError> {
    return Effect.gen({ self: this }, function* () {
      const startedAt = new Date(yield* Clock.currentTimeMillis);
      const { start, seeded } = seed ? yield* this.seed(seed, startedAt) : { start: 0, seeded: [] };
      if (seed) {
        log.info('stage 1: seeded', { count: seeded.length, poolStart: start });
        // The cron would pick the copies up within ten minutes; starting the sync now spares the wait.
        yield* this.#space.runSync();
      }

      const deadline = startedAt.getTime() + Duration.toMillis(syncTimeout);
      let snapshot: SpaceSnapshot = yield* this.#space.snapshot();
      let syncSeconds: number | undefined;
      while (seed) {
        const synced = new Set(snapshot.messages.map((message) => message.gmailId));
        log.info('stage 2: waiting', { synced: seeded.filter(({ gmailId }) => synced.has(gmailId)).length });
        const now = yield* Clock.currentTimeMillis;
        if (seeded.every((message) => synced.has(message.gmailId))) {
          syncSeconds = Math.round((now - startedAt.getTime()) / 1000);
          break;
        }
        if (now >= deadline) {
          break;
        }
        yield* Effect.sleep(pollInterval);
        snapshot = yield* this.#space.snapshot();
      }

      const now = yield* Clock.currentTimeMillis;
      const report = runChecks(snapshot, seed && seeded, {
        now,
        since: now - Duration.toMillis(window),
        hungAfter: Duration.toMillis(hungAfter),
      });
      return {
        ...report,
        startedAt: startedAt.toISOString(),
        spaceId: this.#space.spaceId,
        seed: seed && { seeded: seeded.length, poolSize: seed.pool.length, poolStart: start, syncSeconds },
      };
    });
  }

  /** Inserts the `count` pool messages after the last run's as mail received `now`. */
  seed(
    { pool, count }: SeedOptions,
    now: Date,
  ): Effect.Effect<{ start: number; seeded: ExpectedMessage[] }, MailboxError> {
    return Effect.gen({ self: this }, function* () {
      if (!Number.isInteger(count) || count <= 0 || count > pool.length) {
        return yield* new CanaryError({ message: `cannot seed ${count} of a pool of ${pool.length}` });
      }
      const label = yield* this.#mailbox.ensureLabel(SEED_LABEL);
      const start = yield* this.#cursor(pool.length);
      const next = (start + count) % pool.length;
      const seeded = yield* Effect.forEach(
        Array.from({ length: count }, (_, offset) => (start + offset) % pool.length),
        (index) =>
          Effect.gen({ self: this }, function* () {
            const id = yield* this.#mailbox.insert(makeSeedCopy(pool[index], { index, next, now }), ['INBOX', label]);
            const headers = yield* this.#mailbox.getHeaders(id, ['Subject', 'From']);
            return {
              gmailId: id,
              subject: headers.Subject,
              sender: headers.From && MailSync.parseFromHeader(headers.From)?.email,
            };
          }),
        { concurrency: WRITE_CONCURRENCY },
      );
      return { start, seeded };
    });
  }

  /** Where the last run left off, read off its newest copy; 0 before the first run or on a pool it overran. */
  #cursor(poolSize: number): Effect.Effect<number, MailboxError> {
    return Effect.gen({ self: this }, function* () {
      const [newest] = yield* this.#mailbox.listIds(`label:${SEED_LABEL}`, 1);
      if (!newest) {
        return 0;
      }
      const headers = yield* this.#mailbox.getHeaders(newest, [NEXT_HEADER]);
      const next = Number(headers[NEXT_HEADER]);
      return Number.isInteger(next) && next >= 0 && next < poolSize ? next : 0;
    });
  }
}

const DROPPED_HEADER = /^(date|message-id|bcc|x-dx-seed|x-dx-seed-next):/i;

/**
 * A copy of a pool message as new mail: a `Date` of now, a fresh `Message-ID` (Gmail may drop an insert whose
 * id it has seen) and the seed headers; `Bcc` is dropped and the body left byte for byte.
 */
export const makeSeedCopy = (
  message: string,
  { index, next, now }: { index: number; next: number; now: Date },
): string => {
  const end = /\r?\n\r?\n/.exec(message);
  const head = end ? message.slice(0, end.index) : message;
  // A header's folded continuation lines start with whitespace, so splitting before any other line keeps them.
  const kept = head.split(/\r?\n(?![ \t])/).filter((header) => !DROPPED_HEADER.test(header));
  const added = [
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <seed-${index}.${now.getTime()}@canary.dxos.org>`,
    `${SEED_HEADER}: ${index}`,
    `${NEXT_HEADER}: ${next}`,
  ];
  return [...added, ...kept].join(head.includes('\r\n') ? '\r\n' : '\n') + (end ? message.slice(end.index) : '');
};

// Gmail's simple upload takes 5 MB, and base64url grows a message by a third.
const MAX_MESSAGE_BYTES = 3_500_000;

/** The pool mbox as messages, in file order, without any too large to insert. */
export const parsePool = (mbox: string): string[] =>
  splitMbox(mbox).filter((message) => Buffer.byteLength(message, 'latin1') <= MAX_MESSAGE_BYTES);

/** Every failure of the run, labelled with its check. */
const allFailures = (report: CanaryReport) =>
  [...report.checks, ...(report.fullSync?.checks ?? [])].flatMap(({ id, failures }) =>
    failures.map((failure) => ({ check: id, ...failure })),
  );

/**
 * The run as the events `scripts/ci-event.mjs --batch` posts: one `ci.mail-canary` per run and one
 * `ci.mail-canary.failure` per failure, without message content. Undefined fields are dropped by
 * `JSON.stringify`, so a skipped stage sends no property rather than a zero an average would absorb.
 */
export const renderEvents = (report: CanaryReport, at: string) => {
  const failures = allFailures(report);
  return [
    {
      event: 'ci.mail-canary',
      timestamp: at,
      properties: {
        ok: failures.length === 0,
        failures: failures.length,
        invocations: report.runs?.invocations,
        syncFailures: report.runs && report.checks.find(({ id }) => id === 'S2')?.failures.length,
        seeded: report.seed?.seeded,
        syncSeconds: report.seed?.syncSeconds,
        fullSyncOk: report.fullSync?.checks.every((check) => check.ok),
        fullSyncExpected: report.fullSync?.expected,
        fullSyncSynced: report.fullSync?.synced,
        fullSyncFailed: report.fullSync?.failed,
        fullSyncSeconds: report.fullSync?.syncSeconds,
      },
    },
    ...failures.slice(0, 100).map(({ check, class: failureClass, message, pid, gmailId }, index) => ({
      event: 'ci.mail-canary.failure',
      timestamp: at,
      // The failures of one run share its commit, and so would share a dedup uuid without this.
      dedup: `failure-${index}`,
      properties: { check, class: failureClass, message: message.slice(0, 300), pid, gmailId },
    })),
  ];
};

/** The report as Markdown for the job summary: the verdict, the checks, then up to 50 failures. */
export const renderSummary = (report: CanaryReport): string => {
  const failures = allFailures(report);
  const took = (seconds?: number) => (seconds === undefined ? 'never finished' : `took ${seconds} s`);
  const { seed, fullSync } = report;
  return [
    `## Mail canary: ${failures.length === 0 ? 'passed' : 'FAILED'}`,
    '',
    `- Seed: ${seed ? `${seed.seeded} messages from pool index ${seed.poolStart}; syncing them ${took(seed.syncSeconds)}` : 'skipped'}.`,
    `- Monitor: ${report.runs ? `${report.runs.invocations} sync invocations in the window, ${report.runs.failed} failed` : 'could not read the space'}.`,
    `- Full sync: ${!fullSync ? 'skipped' : fullSync.synced === undefined ? 'could not run' : `${fullSync.synced} of ${fullSync.expected} messages synced, ${fullSync.failed} failed; it ${took(fullSync.syncSeconds)}`}.`,
    '',
    '| Check | Result | Failures |',
    '| --- | --- | --- |',
    ...[...report.checks, ...(fullSync?.checks ?? [])].map(
      (check) => `| ${check.id} ${check.name} | ${check.ok ? 'pass' : 'FAIL'} | ${check.failures.length} |`,
    ),
    '',
    ...failures
      .slice(0, 50)
      .map(
        (failure) =>
          `- ${failure.check} ${failure.class} ${failure.pid ?? failure.gmailId ?? ''}: ${failure.message.replace(/\s+/g, ' ').slice(0, 300)}`,
      ),
    '',
  ].join('\n');
};
