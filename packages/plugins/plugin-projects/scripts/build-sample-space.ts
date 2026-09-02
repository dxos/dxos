//
// Copyright 2026 DXOS.org
//

/**
 * Builds the Tidepool software-project sample space and writes its JSON snapshot to disk.
 *
 * Nothing is committed: the archive is produced on demand and imported into Composer via
 * `client.spaces.import(...)`, so there is no fixture to keep in step with the schemas. The shape
 * is asserted by `src/sample.test.ts` instead.
 *
 *   pnpm run build-sample -- --out ./tidepool.dx.json
 *
 * Needs Node 22+ (`node:sqlite`) — run it through moon or with proto's Node on PATH.
 */

import * as Effect from 'effect/Effect';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildArchive } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import { TidepoolSpace } from '../src/sample';

const __dirname = dirname(fileURLToPath(import.meta.url));

const parseOut = (argv: string[]): string => {
  const index = argv.indexOf('--out');
  return index >= 0 && argv[index + 1] ? resolve(argv[index + 1]) : resolve(__dirname, 'tidepool.dx.json');
};

const out = parseOut(process.argv.slice(2));

await EffectEx.runPromise(
  Effect.gen(function* () {
    yield* Effect.log('building…');
    const { json, objectCount } = yield* buildArchive(TidepoolSpace());

    yield* Effect.promise(() => writeFile(out, json + '\n', 'utf8'));
    yield* Effect.log(`wrote ${out} (${json.length} bytes, ${objectCount} objects)`);
  }),
);
