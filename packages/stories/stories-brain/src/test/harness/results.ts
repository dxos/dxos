//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { log } from '@dxos/log';

// Results are written under the git-ignored `fixtures/local/results/` so research output stays local.
const RESULTS_DIR = fileURLToPath(new URL('../../../fixtures/local/results/', import.meta.url));

/** Path for a named result document (override the whole path with `RESULTS_OUT`). */
export const resultsPath = (name: string): string => process.env.RESULTS_OUT ?? `${RESULTS_DIR}${name}.json`;

/** Writes a result document as pretty JSON, creating the directory as needed, and logs the path. */
export const writeResults = (name: string, report: unknown): string => {
  const path = resultsPath(name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(report, null, 2));
  log.info('wrote results', { path });
  return path;
};

export const round = (value: number): number => Math.round(value * 100) / 100;
