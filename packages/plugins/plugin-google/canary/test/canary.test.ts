//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { FullSync } from '../full-sync.ts';
import { CanaryMailbox, credentialsFromEnv } from '../mailbox.ts';
import { type CanaryReport, Nightly, parsePool, renderSummary, toEventProperties } from '../nightly.ts';
import { CanarySpace, previewClientLayer, recoverIdentity } from '../space.ts';

const credentials = credentialsFromEnv();
const { DX_CANARY_RECOVERY_PHRASE: phrase, DX_CANARY_SPACE_ID: spaceId, DX_CANARY_POOL: poolPath } = process.env;
const SYNC_TIMEOUT_MINUTES = Number(process.env.DX_CANARY_SYNC_TIMEOUT_MIN ?? 30);
const FULL_SYNC_TIMEOUT_MINUTES = Number(process.env.DX_CANARY_FULL_SYNC_TIMEOUT_MIN ?? 60);

/** `seed` (stage 1, needs the pool), `full` (stage 3); stage 2 always runs. */
const STAGES = new Set((process.env.DX_CANARY_STAGES ?? 'seed,full').split(',').map((stage) => stage.trim()));
const seeding = STAGES.has('seed');
const fullSync = STAGES.has('full');

/**
 * The nightly canary against preview (README). Tagged `sync-e2e`, which `test` excludes;
 * `moon run plugin-google:mail-canary` runs it. Skips without the secrets, or without the pool
 * (`DX_CANARY_POOL`, the pulled `enron-pool` fixture) when it seeds.
 */
describe(
  'mail canary',
  {
    tags: ['sync-e2e'],
    timeout: (SYNC_TIMEOUT_MINUTES + (fullSync ? FULL_SYNC_TIMEOUT_MINUTES : 0) + 25) * 60_000,
    retry: 0,
  },
  () => {
    test.skipIf(!credentials || !phrase || !spaceId || (seeding && !poolPath))(
      'seeded mail syncs, no sync run of the past day failed, and a fresh space syncs in full',
      async ({ expect }) => {
        if (!credentials || !phrase || !spaceId) {
          return;
        }
        const dir = process.env.DX_CANARY_REPORT_DIR ?? join(tmpdir(), 'mail-canary');
        await mkdir(dir, { recursive: true });
        const output = (name: string, content: string) => writeFile(join(dir, name), content);

        const result = await EffectEx.runPromise(
          Effect.gen(function* () {
            const mailbox = yield* CanaryMailbox.connect(credentials);
            yield* recoverIdentity(phrase);
            const nightly = new Nightly(mailbox, yield* CanarySpace.open(spaceId));
            const report = yield* nightly.run({
              seed:
                seeding && poolPath
                  ? {
                      pool: parsePool(readFileSync(poolPath, 'latin1')),
                      count: Number(process.env.DX_CANARY_SEED_COUNT ?? 100),
                    }
                  : undefined,
              syncTimeout: Duration.minutes(SYNC_TIMEOUT_MINUTES),
              pollInterval: Duration.minutes(2),
              window: Duration.hours(24),
            });
            return {
              ...report,
              fullSync: fullSync
                ? yield* new FullSync(mailbox, credentials).run({
                    days: Number(process.env.DX_CANARY_FULL_SYNC_DAYS ?? 730),
                    syncTimeout: Duration.minutes(FULL_SYNC_TIMEOUT_MINUTES),
                    pollInterval: Duration.minutes(1),
                    tokenRefresh: Duration.minutes(30),
                    sample: 50,
                  })
                : undefined,
            } satisfies CanaryReport;
          }).pipe(Effect.provide(previewClientLayer), Effect.result),
        );

        // Written before asserting, so the workflow can summarize and record a run that failed.
        if (Result.isFailure(result)) {
          const { message } = result.failure;
          // A grant Google no longer honors: revoked, password changed, or unused for six months.
          const failureClasses = /invalid_grant/.test(message) ? 'AUTH' : 'SETUP';
          await output('summary.json', JSON.stringify({ ok: false, failureClasses, error: message }));
          await output('summary.md', `## Mail canary: could not run\n\n${message}\n`);
          expect.fail(`the canary could not run: ${message}`);
          return;
        }
        const report = result.success;
        await output('report.json', JSON.stringify(report, null, 2));
        await output('summary.json', JSON.stringify(toEventProperties(report)));
        await output('summary.md', renderSummary(report));
        expect(
          [...report.checks, ...(report.fullSync?.checks ?? [])].flatMap((check) =>
            check.failures.map((failure) => `${check.id} ${failure.class} ${failure.message}`),
          ),
        ).toEqual([]);
      },
    );
  },
);
