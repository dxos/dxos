//
// Copyright 2026 DXOS.org
//

/**
 * Builds one of the sample spaces and writes its JSON snapshot to disk.
 *
 * Produced on demand rather than committed, so there is no fixture to keep in step with the
 * schemas; each space's `sample.test.ts` asserts its shape instead.
 *
 *   pnpm run build-sample -- --space crm --out ./northwind.dx.json
 *
 * One script for both, since the samples moved here together: the definitions differ only by which
 * one is passed to `buildArchive`.
 *
 * Needs Node 22+ (`node:sqlite`) — run it through moon or with proto's Node on PATH.
 */

import * as Effect from 'effect/Effect';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildArchive } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import { PipelineSpace, TidepoolSpace } from '../src/sample/index.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Only the output name is shared. Each definition has its own phase map, so the two `buildArchive`
// calls stay in separate branches below rather than behind one value whose type would unify to one
// of them.
const SPACES = {
  crm: { file: 'northwind.dx.json' },
  projects: { file: 'tidepool.dx.json' },
} as const;

type SpaceKey = keyof typeof SPACES;

const parseArgs = (argv: string[]): { space: SpaceKey; out: string } => {
  const flag = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const space = (flag('space') ?? 'crm') as SpaceKey;
  if (!(space in SPACES)) {
    throw new Error(`--space must be one of ${Object.keys(SPACES).join(', ')}, got "${space}"`);
  }

  const out = flag('out');
  return { space, out: out ? resolve(out) : resolve(__dirname, SPACES[space].file) };
};

const { space, out } = parseArgs(process.argv.slice(2));

await EffectEx.runPromise(
  Effect.gen(function* () {
    yield* Effect.log(`building ${space}…`);
    const { json, objectCount } =
      space === 'crm' ? yield* buildArchive(PipelineSpace()) : yield* buildArchive(TidepoolSpace());

    yield* Effect.promise(() => writeFile(out, json + '\n', 'utf8'));
    yield* Effect.log(`wrote ${out} (${json.length} bytes, ${objectCount} objects)`);
  }),
);
