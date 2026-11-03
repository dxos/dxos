//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

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
    /** Minutes until every copy was in the mailbox feed; absent when they never all arrived. */
    readonly syncMinutes?: number;
  };
};

/** Everything one nightly run produced; written to disk before the test asserts. */
export type CanaryReport = NightlyReport & {
  /** Stage 3: absent when the run skipped it. */
  readonly fullSync?: FullSyncReport;
};

export type NightlyOptions = {
  /** Stage 1: seed `count` messages of the Enron pool (one RFC 5322 message per entry, in a fixed order). */
  readonly seed?: { readonly pool: readonly string[]; readonly count: number };
  /** How long to wait for every copy to reach the mailbox feed. */
  readonly syncTimeout: Duration.Input;
  readonly pollInterval: Duration.Input;
  /** How far back the sync failure check looks. */
  readonly window: Duration.Input;
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
 * Stages 1 and 2 against the canary space. Stage 1 inserts the next `count` pool messages as mail received now
 * and waits for the space's own sync to pick them up; stage 2 checks that every copy arrived intact and that no
 * sync run in the window failed.
 *
 * The pool stays out of Gmail: the sync takes every message added to the account, so mail parked there would
 * be synced the moment it landed rather than tonight.
 */
export class Nightly {
  readonly #mailbox: NightlyMailbox;
  readonly #space: Pick<CanarySpace, 'spaceId' | 'snapshot'>;

  constructor(mailbox: NightlyMailbox, space: Pick<CanarySpace, 'spaceId' | 'snapshot'>) {
    this.#mailbox = mailbox;
    this.#space = space;
  }

  run({ seed, syncTimeout, pollInterval, window }: NightlyOptions): Effect.Effect<NightlyReport, MailboxError> {
    return Effect.gen({ self: this }, function* () {
      const startedAt = new Date();
      const { start, seeded } = seed ? yield* this.seed(seed.pool, seed.count, startedAt) : { start: 0, seeded: [] };

      const deadline = startedAt.getTime() + Duration.toMillis(syncTimeout);
      let snapshot: SpaceSnapshot = yield* this.#space.snapshot();
      let syncMinutes: number | undefined;
      while (seed) {
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
      const report = runChecks(snapshot, seed && seeded, { now, since: now - Duration.toMillis(window) });
      return {
        ...report,
        startedAt: startedAt.toISOString(),
        spaceId: this.#space.spaceId,
        seed: seed && { seeded: seeded.length, poolSize: seed.pool.length, poolStart: start, syncMinutes },
      };
    });
  }

  /** Inserts the `count` pool messages after the last run's into the inbox as mail received `now`. */
  seed(
    pool: readonly string[],
    count: number,
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
            const { headers } = yield* this.#mailbox.getHeaders(id, ['Subject', 'From']);
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
      const { headers } = yield* this.#mailbox.getHeaders(newest, [NEXT_HEADER]);
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

/** Flat properties for the `ci.mail-canary` PostHog event: no nesting, no message content. */
export const toEventProperties = (report: CanaryReport): Record<string, string | number | boolean> => {
  const checks = [...report.checks, ...(report.fullSync?.checks ?? [])];
  return {
    ok: report.ok && (report.fullSync?.ok ?? true),
    failedChecks: checks.flatMap((check) => (check.ok ? [] : [check.id])).join(','),
    failureClasses: [...new Set(checks.flatMap((check) => check.failures.map((failure) => failure.class)))]
      .sort()
      .join(','),
    seeded: report.seed?.seeded ?? 0,
    poolSize: report.seed?.poolSize ?? 0,
    poolStart: report.seed?.poolStart ?? -1,
    syncMinutes: report.seed?.syncMinutes ?? -1,
    ...report.runs,
    fullSyncExpected: report.fullSync?.expected ?? -1,
    fullSyncSynced: report.fullSync?.synced ?? -1,
    fullSyncMinutes: report.fullSync?.syncMinutes ?? -1,
    fullSyncInvocations: report.fullSync?.runs.invocations ?? -1,
    fullSyncFailed: report.fullSync?.runs.failed ?? -1,
  };
};

/** The report as Markdown for the job summary: the verdict, each stage, the checks, then up to 50 failures. */
export const renderSummary = (report: CanaryReport): string => {
  const { seed, fullSync } = report;
  const checks = [...report.checks, ...(fullSync?.checks ?? [])];
  const ok = report.ok && (fullSync?.ok ?? true);
  const failures = checks.flatMap((check) => check.failures.map((failure) => ({ check: check.id, ...failure })));
  const arrived = seed?.syncMinutes === undefined ? 'never all arrived' : `all arrived in ${seed.syncMinutes} min`;
  const fullSynced = fullSync?.syncMinutes === undefined ? 'did not finish' : `finished in ${fullSync.syncMinutes} min`;
  const runs = ({ runs, invocations, failed }: CanaryReport['runs']) =>
    `${runs} sync runs (${invocations} invocations, ${failed} failed)`;
  return [
    `## Mail canary: ${ok ? 'passed' : 'FAILED'}`,
    '',
    `Space \`${report.spaceId}\`, ${report.startedAt}.`,
    '',
    seed
      ? `1. **Seed.** ${seed.seeded} messages from pool index ${seed.poolStart} of ${seed.poolSize}; the copies ${arrived}.`
      : '1. **Seed.** Skipped.',
    `2. **Monitor.** ${runs(report.runs)} in the window.`,
    fullSync
      ? `3. **Full sync.** Fresh space \`${fullSync.spaceId ?? 'none'}\` over ${fullSync.days} days: ${fullSync.synced} of ${fullSync.expected} Gmail messages synced; the sync ${fullSynced}; ${runs(fullSync.runs)}.`
      : '3. **Full sync.** Skipped.',
    '',
    '| Check | Result | Failures |',
    '| --- | --- | --- |',
    ...checks.map(
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
