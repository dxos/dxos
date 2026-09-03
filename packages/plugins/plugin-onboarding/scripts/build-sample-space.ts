//
// Copyright 2026 DXOS.org
//

/**
 * Builds the Bramble Coffee Roasters sample space and writes its JSON snapshot to disk.
 *
 * The snapshot is committed at:
 *   packages/plugins/plugin-onboarding/src/content/sample/space.dx.json
 *
 * The onboarding plugin imports it on first launch so every new identity gets a fully populated
 * themed sample space without the builder ever running in the browser — which is why the content
 * lives here under `scripts/` rather than in `src/`.
 *
 * Run via the moon task: `moon run plugin-onboarding:build-sample`.
 *
 * The content itself is a list of `SampleSpace` phases in `scripts/sample/`; this file is only the
 * file-in/file-out shell around them.
 */

import * as Effect from 'effect/Effect';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildArchive } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import { BrambleSpace } from './sample';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OUTPUT_PATH = resolve(__dirname, '../src/content/sample/space.dx.json');
const ABOUT_MD_PATH = resolve(__dirname, '../src/content/sample/ABOUT.md');
const TOUR_MD_PATH = resolve(__dirname, '../src/content/sample/README.md');

await EffectEx.runPromise(
  Effect.gen(function* () {
    const aboutMd = yield* Effect.promise(() => readFile(ABOUT_MD_PATH, 'utf8'));
    const tourMd = yield* Effect.promise(() => readFile(TOUR_MD_PATH, 'utf8'));

    yield* Effect.log('building…');
    const { json, objectCount } = yield* buildArchive(BrambleSpace({ aboutMd, tourMd }));

    // Stored as a single line so regenerations produce a 1-line diff rather than thousands of
    // changed lines. The file is valid JSON; use `jq .` to inspect it.
    yield* Effect.promise(() => writeFile(OUTPUT_PATH, json + '\n', 'utf8'));
    yield* Effect.log(`wrote ${OUTPUT_PATH} (${json.length} bytes, ${objectCount} objects)`);
  }),
);
