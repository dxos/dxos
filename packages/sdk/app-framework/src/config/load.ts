//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { build } from 'esbuild';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Config2 } from '@dxos/protocols';

const CONFIG_BASENAMES = ['dx.config.ts', 'dx.config.mjs', 'dx.config.js'];

const decodeConfig2 = Schema.decodeUnknownSync(Config2.Config);

/**
 * Resolves the first `dx.config.{ts,mjs,js}` found under `dir`, or `undefined` if none exist.
 * Pass the result to {@link loadDxConfig}.
 */
export const findDxConfigFile = (dir: string): string | undefined =>
  CONFIG_BASENAMES.map((basename) => join(dir, basename)).find((candidate) => existsSync(candidate));

/**
 * Loads and validates a `dx.config.ts` (or `.mjs`/`.js`) file at the given `filePath`.
 *
 * Transpiles the file with esbuild — leaving its bare imports (`@dxos/protocols`, `@dxos/app-framework`, …)
 * external so they resolve from the project's `node_modules` — imports the result, then decodes the
 * default export against the `Config2` schema (a malformed config throws a `Schema` parse error).
 * Node-only (esbuild + filesystem); used by `composerPlugin` and `dx registry publish`.
 */
export const loadDxConfig = async (filePath: string): Promise<Config2.Config> => {
  const result = await build({
    entryPoints: [filePath],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    // Leave node_modules (incl. @dxos/*) as runtime imports so the temp module below resolves them
    // from the project's node_modules rather than inlining heavy deps (effect, etc.) on every load.
    packages: 'external',
    logLevel: 'silent',
  });

  // Import via a temp file so its externalized bare specifiers resolve against the project's
  // node_modules (a data-URL import cannot resolve bare specifiers).
  const tempPath = join(filePath, '..', `.dx.config.${randomUUID()}.mjs`);
  try {
    await writeFile(tempPath, result.outputFiles[0].text, 'utf-8');
    const module = await import(pathToFileURL(tempPath).href);
    return decodeConfig2(module.default);
  } finally {
    await rm(tempPath, { force: true });
  }
};
