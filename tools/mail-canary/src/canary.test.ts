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

import { accessToken, credentialsFromEnv, makeGmail } from './gmail.ts';
import { runNightly } from './nightly.ts';
import { toEventProperties } from './report.ts';
import { makeDx, spaceReader } from './space.ts';

const credentials = credentialsFromEnv();
const recoveryPhrase = process.env.DX_CANARY_RECOVERY_PHRASE;
const spaceId = process.env.DX_CANARY_SPACE_ID;
const settings = credentials && recoveryPhrase && spaceId ? { credentials, recoveryPhrase, spaceId } : undefined;

const SYNC_TIMEOUT_MINUTES = Number(process.env.DX_CANARY_SYNC_TIMEOUT_MIN ?? 45);

/**
 * The nightly canary against preview (see README): seed the test account, wait for the space's own
 * sync, and check every sync run of the last day. Tagged `sync-e2e`, which the default `test` task
 * excludes; `moon run mail-canary:nightly` selects it. Skips when the secrets are not set.
 */
describe('mail canary', { tags: ['sync-e2e'], timeout: (SYNC_TIMEOUT_MINUTES + 25) * 60_000, retry: 0 }, () => {
  test.skipIf(!settings)('seeded mail syncs and every sync run of the last day ended well', async ({ expect }) => {
    if (!settings) {
      return;
    }
    const home = await mkdtemp(join(tmpdir(), 'mail-canary-'));
    const reportPath = process.env.DX_CANARY_REPORT ?? join(home, 'report.json');
    await mkdir(dirname(reportPath), { recursive: true });

    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        const gmail = makeGmail(yield* accessToken(settings.credentials));
        const dx = makeDx({ home });
        yield* dx.login(settings.recoveryPhrase);
        return yield* runNightly(gmail, spaceReader(dx, settings.spaceId), {
          spaceId: settings.spaceId,
          count: Number(process.env.DX_CANARY_SEED_COUNT ?? 100),
          syncTimeout: Duration.minutes(SYNC_TIMEOUT_MINUTES),
          pollInterval: Duration.minutes(2),
          window: Duration.hours(25),
        });
      }).pipe(Effect.result),
    );

    // Written before asserting, so the workflow can summarize and record a run that failed.
    const summaryPath = join(dirname(reportPath), 'summary.json');
    if (Result.isFailure(result)) {
      const message = result.failure.message;
      await writeFile(summaryPath, JSON.stringify({ ok: false, failureClasses: 'SETUP', error: message }, null, 2));
      expect.fail(`the canary could not run: ${message}`);
      return;
    }

    const report = result.success;
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    await writeFile(summaryPath, JSON.stringify(toEventProperties(report), null, 2));
    const failures = report.checks.flatMap((check) =>
      check.failures.map(
        (failure) => `${check.id} ${failure.class} ${failure.pid ?? failure.gmailId ?? ''} ${failure.message}`,
      ),
    );
    expect(failures).toEqual([]);
  });
});
