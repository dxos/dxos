//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Config2 } from '@dxos/protocols';

const CONFIG_BASENAMES = ['dx.config.ts', 'dx.config.mjs', 'dx.config.js'];

const decodeConfig2 = Schema.decodeUnknownSync(Config2.Config);

// Evaluated by the subprocess below; dependency-free so any plugin-toolchain node runs it. The
// result travels through a file (argv[2]) rather than stdout, which belongs to the config — a
// `console.log` during module evaluation would otherwise corrupt the JSON.
const LOADER_SCRIPT =
  'const module = await import(process.argv[1]); const { writeFileSync } = await import("node:fs"); writeFileSync(process.argv[2], JSON.stringify(module.default));';

const LOADER_TIMEOUT = 30_000;

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
 * The config is evaluated by a `node` subprocess and handed back as JSON, so its imports resolve in
 * the plugin's own module context — one behavior whether the caller is node (`composerPlugin`), bun,
 * or the compiled CLI, whose embedded resolver cannot reach an external `node_modules`. `Config2` is
 * pure data, so JSON carries it losslessly. node executes the TypeScript itself (type stripping), so
 * a config may only use erasable syntax — no `enum`, no `namespace`.
 */
export const loadDxConfig = async (filePath: string): Promise<Config2.Config> => {
  const resultPath = join(tmpdir(), `dx-config-${randomUUID()}.json`);
  try {
    execFileSync('node', ['--input-type=module', '-e', LOADER_SCRIPT, pathToFileURL(filePath).href, resultPath], {
      cwd: dirname(filePath),
      // The subprocess's stdout and stderr pass through, so the config's own logs and a throwing
      // config's actual error both reach the terminal.
      stdio: ['ignore', 'inherit', 'inherit'],
      timeout: LOADER_TIMEOUT,
    });

    return decodeConfig2(JSON.parse(readFileSync(resultPath, 'utf8')));
  } finally {
    rmSync(resultPath, { force: true });
  }
};
