//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { existsSync } from 'node:fs';
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
 * Loads a `dx.config.ts` (or `.mjs`/`.js`) file at the given `filePath`, decoding its default export
 * against the `Config2` schema — a malformed config throws a `Schema` parse error.
 *
 * The runtime executes the TypeScript itself (bun natively, node by type stripping), so a config may
 * only use erasable syntax — no `enum`, no `namespace`.
 */
export const loadDxConfig = async (filePath: string): Promise<Config2.Config> => {
  const module = await import(pathToFileURL(filePath).href);
  return decodeConfig2(module.default);
};
