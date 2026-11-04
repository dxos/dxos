//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';
import { parse } from 'yaml';

import * as EffectEx from '@dxos/effect/EffectEx';
import { fixturePath } from '@dxos/fixtures';
import { SpaceId } from '@dxos/keys';

import { type CheckResult, type FailureClass, check, classifyError } from '../checks.ts';
import { FullSync } from '../full-sync.ts';
import { CanaryError, CanaryMailbox, credentialsFromEnv } from '../mailbox.ts';
import { type CanaryReport, Nightly, type NightlyReport, parsePool, renderEvents, renderSummary } from '../nightly.ts';
import { CanarySpace, previewClientLayer, recoverIdentity } from '../space.ts';

const Config = Schema.Struct({
  spaceId: SpaceId,
  runTimeoutMinutes: Schema.Number,
  seed: Schema.Struct({ count: Schema.Int }),
  monitor: Schema.Struct({
    timeoutMinutes: Schema.Number,
    pollSeconds: Schema.Number,
    windowHours: Schema.Number,
    hungMinutes: Schema.Number,
  }),
  fullSync: Schema.Struct({
    enabled: Schema.Boolean,
    days: Schema.Int,
    timeoutMinutes: Schema.Number,
    pollSeconds: Schema.Number,
    tokenRefreshMinutes: Schema.Number,
  }),
  edge: Schema.Struct({
    openMinutes: Schema.Number,
    readMinutes: Schema.Number,
    triggerMinutes: Schema.Number,
    deleteMinutes: Schema.Number,
  }),
});

const config = Schema.decodeUnknownSync(Config)(
  parse(readFileSync(join(import.meta.dirname, '../canary.yml'), 'utf8')),
);
const credentials = credentialsFromEnv();
const phrase = process.env.DX_CANARY_RECOVERY_PHRASE;
const pool = config.seed.count > 0 ? fixturePath('enron-pool', { extension: 'mbox' }) : undefined;
/** Read by the workflow's report steps. */
const REPORT_DIR = join(import.meta.dirname, '../out');

const waits = {
  open: Duration.minutes(config.edge.openMinutes),
  read: Duration.minutes(config.edge.readMinutes),
  trigger: Duration.minutes(config.edge.triggerMinutes),
  delete: Duration.minutes(config.edge.deleteMinutes),
};
const hungAfter = Duration.minutes(config.monitor.hungMinutes);

/** A check that could not run, failed as SETUP unless its error names a known cause. */
const couldNotRun = (id: string, name: string, message: string): CheckResult => {
  const failureClass: FailureClass = classifyError(message);
  return check(id, name, [{ class: failureClass === 'UNKNOWN' ? 'SETUP' : failureClass, message }]);
};

// A run stopped by `runTimeoutMinutes` still waits for its fresh space's deletion before it writes the report.
const testTimeout = (config.runTimeoutMinutes + config.edge.deleteMinutes + 5) * 60_000;

/**
 * The nightly canary against preview (README), configured by `canary.yml`. Tagged `sync-e2e`, which `test` excludes;
 * `moon run plugin-google:mail-canary` runs it.
 */
describe('mail canary', { tags: ['sync-e2e'], timeout: testTimeout, retry: 0 }, () => {
  test('seeded mail syncs, no sync run of the window failed, and a fresh space syncs in full', async ({ expect }) => {
    // A missing secret fails the nightly rather than skipping it into a green run.
    if (!credentials || !phrase) {
      expect.fail('set DX_CANARY_RECOVERY_PHRASE, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN');
      return;
    }
    const startedAt = new Date().toISOString();
    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        const mailbox = yield* CanaryMailbox.connect(credentials);
        yield* recoverIdentity(phrase);
        // Each stage that cannot run fails its own check, so the next stage still runs.
        const monitored = yield* CanarySpace.open(config.spaceId, waits).pipe(
          Effect.flatMap((space) =>
            new Nightly(mailbox, space).run({
              seed: pool ? { pool: parsePool(readFileSync(pool, 'latin1')), ...config.seed } : undefined,
              syncTimeout: Duration.minutes(config.monitor.timeoutMinutes),
              pollInterval: Duration.seconds(config.monitor.pollSeconds),
              window: Duration.hours(config.monitor.windowHours),
              hungAfter,
            }),
          ),
          Effect.result,
        );
        const nightly: NightlyReport = Result.isSuccess(monitored)
          ? monitored.success
          : {
              startedAt,
              spaceId: config.spaceId,
              checks: [couldNotRun('S2', 'No sync failures', monitored.failure.message)],
            };
        const fullSync = config.fullSync.enabled
          ? yield* new FullSync(mailbox, credentials)
              .run({
                days: config.fullSync.days,
                syncTimeout: Duration.minutes(config.fullSync.timeoutMinutes),
                pollInterval: Duration.seconds(config.fullSync.pollSeconds),
                tokenRefresh: Duration.minutes(config.fullSync.tokenRefreshMinutes),
                hungAfter,
                waits,
              })
              .pipe(
                Effect.catch((error) =>
                  Effect.succeed({
                    days: config.fullSync.days,
                    expected: 0,
                    checks: [couldNotRun('F1', 'Every Gmail message of the window synced', error.message)],
                  }),
                ),
              )
          : undefined;
        const noPool =
          config.seed.count > 0 && !pool
            ? [couldNotRun('S1', 'Every seeded message synced', 'the enron-pool fixture was not pulled')]
            : [];
        return { ...nightly, checks: [...noPool, ...nightly.checks], fullSync } satisfies CanaryReport;
      }).pipe(
        Effect.timeoutOrElse({
          duration: Duration.minutes(config.runTimeoutMinutes),
          orElse: () => Effect.fail(new CanaryError({ message: `the run passed ${config.runTimeoutMinutes} minutes` })),
        }),
        Effect.provide(previewClientLayer),
        Effect.result,
      ),
    );
    const report: CanaryReport = Result.isSuccess(result)
      ? result.success
      : { startedAt, spaceId: config.spaceId, checks: [couldNotRun('RUN', 'The canary ran', result.failure.message)] };

    // Written before asserting, so the workflow can summarize and record a run that failed.
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(join(REPORT_DIR, 'report.json'), JSON.stringify(report, null, 2));
    writeFileSync(
      join(REPORT_DIR, 'events.ndjson'),
      renderEvents(report, new Date().toISOString())
        .map((event) => `${JSON.stringify(event)}\n`)
        .join(''),
    );
    writeFileSync(join(REPORT_DIR, 'summary.md'), renderSummary(report));
    expect(
      [...report.checks, ...(report.fullSync?.checks ?? [])].flatMap((check) =>
        check.failures.map((failure) => `${check.id} ${failure.class} ${failure.message}`),
      ),
    ).toEqual([]);
  });
});
