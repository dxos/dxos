//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { CanaryMailbox, canaryAccount, credentialsFromEnv } from '../gmail/index.ts';
import { Seeder } from '../seed/index.ts';
import { CanarySpace, previewClientLayer } from '../space/index.ts';
import { Nightly } from './Nightly.ts';
import { renderSummary, toEventProperties } from './report.ts';

const credentials = credentialsFromEnv();
const recoveryPhrase = process.env.DX_CANARY_RECOVERY_PHRASE;
const spaceId = process.env.DX_CANARY_SPACE_ID;
const settings = credentials && recoveryPhrase && spaceId ? { credentials, recoveryPhrase, spaceId } : undefined;

const SYNC_TIMEOUT_MINUTES = Number(process.env.DX_CANARY_SYNC_TIMEOUT_MIN ?? 45);

/**
 * The nightly canary against preview (see README): seed the test account, wait for the space's own
 * sync, and check every sync run of the last day. Tagged `sync-e2e`, which the default `test` task
 * excludes; `moon run plugin-google:mail-canary` selects it. Skips when the secrets are not set.
 */
describe('mail canary', { tags: ['sync-e2e'], timeout: (SYNC_TIMEOUT_MINUTES + 25) * 60_000, retry: 0 }, () => {
  test.skipIf(!settings)('seeded mail syncs and every sync run of the last day ended well', async ({ expect }) => {
    if (!settings) {
      return;
    }
    const reportDir = await mkdtemp(join(tmpdir(), 'mail-canary-'));
    const reportPath = process.env.DX_CANARY_REPORT ?? join(reportDir, 'report.json');
    await mkdir(dirname(reportPath), { recursive: true });

    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        const gmail = yield* CanaryMailbox.connect(settings.credentials, canaryAccount());
        const space = yield* CanarySpace.open(settings);
        return yield* new Nightly({ seeder: new Seeder(gmail), space }).run({
          count: Number(process.env.DX_CANARY_SEED_COUNT ?? 100),
          syncTimeout: Duration.minutes(SYNC_TIMEOUT_MINUTES),
          pollInterval: Duration.minutes(2),
          window: Duration.hours(25),
        });
      }).pipe(Effect.provide(previewClientLayer), Effect.result),
    );

    // Written before asserting, so the workflow can summarize and record a run that failed: report.json
    // for the artifact, summary.json for the PostHog event and summary.md for the job summary.
    const output = (name: string, content: string) => writeFile(join(dirname(reportPath), name), content);
    if (Result.isFailure(result)) {
      const message = result.failure.message;
      // A refresh token Google no longer honors (revoked, password changed, unused for six months).
      const failureClasses = /invalid_grant/.test(message) ? 'AUTH' : 'SETUP';
      await output('summary.json', JSON.stringify({ ok: false, failureClasses, error: message }));
      const advice =
        failureClasses === 'AUTH'
          ? '\n\nThe Gmail grant is dead: rerun `02-import-pool.mjs auth` and update `REFRESH_TOKEN` and the CI secret.\n'
          : '\n';
      await output('summary.md', `## Mail canary: could not run\n\n${message}${advice}`);
      expect.fail(`the canary could not run: ${message}`);
      return;
    }

    const report = result.success;
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    await output('summary.json', JSON.stringify(toEventProperties(report)));
    await output('summary.md', renderSummary(report));
    const failures = report.checks.flatMap((check) =>
      check.failures.map(
        (failure) => `${check.id} ${failure.class} ${failure.pid ?? failure.gmailId ?? ''} ${failure.message}`,
      ),
    );
    expect(failures).toEqual([]);
  });
});
