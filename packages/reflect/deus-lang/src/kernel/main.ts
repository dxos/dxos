//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runImage } from './run.ts';

/** The checked-in compiler image; `DEUS_SEED` overrides it (used by self-build). */
export const SEED_PATH = join(import.meta.dirname, '../../seed/deus.image');

/** `deus [args…]`: runs the DEUS CLI (the seed) on the command line. */
export const main = (argv: string[]): number => {
  const seed = process.env.DEUS_SEED ?? SEED_PATH;
  const { code } = runImage(readFileSync(seed, 'utf8'), { args: argv });
  return code;
};
