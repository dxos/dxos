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

import { FullSync } from '../full-sync.ts';
import { CanaryMailbox, credentialsFromEnv } from '../mailbox.ts';
import { type CanaryReport, Nightly, type NightlyReport, parsePool, renderEvents, renderSummary } from '../nightly.ts';
import { CanarySpace, previewClientLayer, recoverIdentity } from '../space.ts';

const Config = Schema.Struct({
  spaceId: Schema.String,
  seed: Schema.Struct({ count: Schema.Int }),
  monitor: Schema.Struct({ timeoutMinutes: Schema.Number, pollSeconds: Schema.Number, windowHours: Schema.Number }),
  fullSync: Schema.Struct({
    enabled: Schema.Boolean,
    days: Schema.Int,
    timeoutMinutes: Schema.Number,
    pollSeconds: Schema.Number,
    tokenRefreshMinutes: Schema.Number,
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

/**
 * The nightly canary against preview (README), configured by `canary.yml`. Tagged `sync-e2e`, which `test`
 * excludes; `moon run plugin-google:mail-canary` runs it. Skips without the credentials; without the pulled
 * `enron-pool` fixture it runs stages 2 and 3 and fails S1 as SETUP.
 */
describe(
  'mail canary',
  {
    tags: ['sync-e2e'],
    timeout: (config.monitor.timeoutMinutes + config.fullSync.timeoutMinutes + 25) * 60_000,
    retry: 0,
  },
  () => {
    test.skipIf(!credentials || !phrase)(
      'seeded mail syncs, no sync run of the window failed, and a fresh space syncs in full',
      async ({ expect }) => {
        if (!credentials || !phrase) {
          return;
        }
        const result = await EffectEx.runPromise(
          Effect.gen(function* () {
            const mailbox = yield* CanaryMailbox.connect(credentials);
            yield* recoverIdentity(phrase);
            // A stage that cannot run is reported as its check failing, so the next stage still runs.
            const setup = (id: string, name: string, message: string) => ({
              id,
              name,
              ok: false,
              failures: [{ class: 'SETUP' as const, message }],
            });
            const monitored = yield* CanarySpace.open(config.spaceId).pipe(
              Effect.flatMap((space) =>
                new Nightly(mailbox, space).run({
                  seed: pool ? { pool: parsePool(readFileSync(pool, 'latin1')), count: config.seed.count } : undefined,
                  syncTimeout: Duration.minutes(config.monitor.timeoutMinutes),
                  pollInterval: Duration.seconds(config.monitor.pollSeconds),
                  window: Duration.hours(config.monitor.windowHours),
                }),
              ),
              Effect.result,
            );
            const report: NightlyReport = Result.isSuccess(monitored)
              ? monitored.success
              : {
                  ok: false,
                  startedAt: new Date().toISOString(),
                  spaceId: config.spaceId,
                  runs: { runs: 0, invocations: 0, succeeded: 0, yielded: 0, failed: 0 },
                  checks: [setup('S2', 'No sync failures', monitored.failure.message)],
                };
            const fullSync = config.fullSync.enabled
              ? yield* new FullSync(mailbox, credentials).run({
                  days: config.fullSync.days,
                  syncTimeout: Duration.minutes(config.fullSync.timeoutMinutes),
                  pollInterval: Duration.seconds(config.fullSync.pollSeconds),
                  tokenRefresh: Duration.minutes(config.fullSync.tokenRefreshMinutes),
                })
              : undefined;
            const noPool =
              config.seed.count > 0 && !pool
                ? [setup('S1', 'Every seeded message synced', 'the enron-pool fixture was not pulled')]
                : [];
            return { ...report, checks: [...noPool, ...report.checks], fullSync } satisfies CanaryReport;
          }).pipe(Effect.provide(previewClientLayer), Effect.result),
        );

        // Written before asserting, so the workflow can summarize and record a run that failed.
        mkdirSync(REPORT_DIR, { recursive: true });
        const output = (name: string, content: string) => writeFileSync(join(REPORT_DIR, name), content);
        if (Result.isFailure(result)) {
          const { message } = result.failure;
          // A grant Google no longer honors (revoked, password changed, unused for six months) is AUTH.
          const failureClass = /invalid_grant/.test(message) ? 'AUTH' : 'SETUP';
          const at = new Date().toISOString();
          output(
            'events.ndjson',
            `${JSON.stringify({ event: 'ci.mail-canary', timestamp: at, properties: { ok: false, failures: 1 } })}\n${JSON.stringify({ event: 'ci.mail-canary.failure', timestamp: at, properties: { check: 'RUN', class: failureClass, message: message.slice(0, 300) } })}\n`,
          );
          output('summary.md', `## Mail canary: could not run\n\n${message}\n`);
          expect.fail(`the canary could not run: ${message}`);
          return;
        }
        const report = result.success;
        output('report.json', JSON.stringify(report, null, 2));
        output(
          'events.ndjson',
          renderEvents(report, new Date().toISOString())
            .map((event) => `${JSON.stringify(event)}\n`)
            .join(''),
        );
        output('summary.md', renderSummary(report));
        expect(
          [...report.checks, ...(report.fullSync?.checks ?? [])].flatMap((check) =>
            check.failures.map((failure) => `${check.id} ${failure.class} ${failure.message}`),
          ),
        ).toEqual([]);
      },
    );
  },
);
