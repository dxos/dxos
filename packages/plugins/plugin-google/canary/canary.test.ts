//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { CanaryMailbox, credentialsFromEnv } from './mailbox.ts';
import { Nightly, renderSummary, toEventProperties } from './nightly.ts';
import { CanarySpace, previewClientLayer } from './space.ts';

const credentials = credentialsFromEnv();
const { DX_CANARY_RECOVERY_PHRASE: phrase, DX_CANARY_SPACE_ID: spaceId } = process.env;
const SYNC_TIMEOUT_MINUTES = Number(process.env.DX_CANARY_SYNC_TIMEOUT_MIN ?? 45);

/**
 * The nightly canary against preview (README). Tagged `sync-e2e`, which `test` excludes;
 * `moon run plugin-google:mail-canary` runs it. Skips without the secrets.
 */
describe('mail canary', { tags: ['sync-e2e'], timeout: (SYNC_TIMEOUT_MINUTES + 25) * 60_000, retry: 0 }, () => {
  test.skipIf(!credentials || !phrase || !spaceId)(
    'seeded mail syncs and every sync run of the day ended well',
    async ({ expect }) => {
      if (!credentials || !phrase || !spaceId) {
        return;
      }
      const dir = process.env.DX_CANARY_REPORT_DIR ?? join(tmpdir(), 'mail-canary');
      await mkdir(dir, { recursive: true });
      const output = (name: string, content: string) => writeFile(join(dir, name), content);

      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          const nightly = new Nightly(
            yield* CanaryMailbox.connect(credentials),
            yield* CanarySpace.open(spaceId, phrase),
          );
          return yield* nightly.run({
            count: Number(process.env.DX_CANARY_SEED_COUNT ?? 100),
            syncTimeout: Duration.minutes(SYNC_TIMEOUT_MINUTES),
            pollInterval: Duration.minutes(2),
            window: Duration.hours(25),
          });
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
        report.checks.flatMap((check) =>
          check.failures.map((failure) => `${check.id} ${failure.class} ${failure.message}`),
        ),
      ).toEqual([]);
    },
  );
});
