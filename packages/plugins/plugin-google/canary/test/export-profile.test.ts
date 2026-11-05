//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';

import { edgeWaits, loadConfig } from '../config.ts';
import { CanaryError } from '../mailbox.ts';
import { PROFILE_FIXTURE, packProfile } from '../profile.ts';
import { CanarySpace, previewClientLayer, signIn } from '../space.ts';

const OUT_DIR = join(import.meta.dirname, '../out');

/**
 * Exports the canary identity's profile (README, Setup step 4): recovers the identity into a new data root as one more
 * device, waits until the canary space has replicated, and packs the data root for `fixtures push`. Run by hand with
 * `moon run plugin-google:mail-canary-profile`; tagged `sync-e2e`, which `test` excludes.
 */
describe('mail canary profile', { tags: ['sync-e2e'], timeout: 25 * 60_000, retry: 0 }, () => {
  test('exports the canary identity profile', async ({ expect }) => {
    const phrase = process.env.DX_CANARY_RECOVERY_PHRASE;
    if (!phrase) {
      expect.fail('set DX_CANARY_RECOVERY_PHRASE');
      return;
    }
    const config = loadConfig();
    const waits = edgeWaits(config);
    const dataRoot = mkdtempSync(join(tmpdir(), `${PROFILE_FIXTURE}-`));
    await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* signIn(phrase, { profile: false, wait: waits.open });
        const space = yield* CanarySpace.open(config.spaceId, waits);
        log.info('canary space open; reading it');
        // Documents matched with EDGE and feeds pulled, so a run starts from a replicated space.
        yield* space.snapshot();
      }).pipe(
        // A replication that stalls fails with a reason instead of running into the task's timeout.
        Effect.timeoutOrElse({
          duration: Duration.sum(waits.open, waits.read),
          orElse: () => Effect.fail(new CanaryError({ message: 'the canary space did not replicate in time' })),
        }),
        Effect.provide(previewClientLayer(dataRoot)),
      ),
    );

    // Packed after the layer's scope closed the client, so the SQLite file is complete.
    mkdirSync(OUT_DIR, { recursive: true });
    const archive = packProfile(dataRoot, OUT_DIR);
    // The data root holds the device's private key; only the archive, pushed encrypted, should outlive the export.
    rmSync(dataRoot, { recursive: true, force: true });
    log.info('profile exported; push it with `moon run fixtures:push -- <archive> --scope agents`', { archive });
  });
});
