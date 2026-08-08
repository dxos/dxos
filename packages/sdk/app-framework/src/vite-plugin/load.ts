//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect';
import * as Schema from 'effect/Schema';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Config2 } from '@dxos/protocols';

const CONFIG_BASENAMES = ['dx.config.ts', 'dx.config.mjs', 'dx.config.js'];

const decodeConfig2 = Schema.decodeUnknownSync(Config2.Config);

const EFFECT_SPECIFIER = /^effect(?:\/(.+))?$/;
// Bundled output spells these as `from"effect/Schema"` or a bare `import"effect"`.
const EXTERNAL_SPECIFIER = /(?:from|import)\s*"(effect(?:\/[^"]+)?)"/g;

const NODE_STD_PREFIX = '@dxos/node-std/';

// Only the surface used below, so this file needs no bun typings to compile for node.
declare const Bun: {
  build: (options: {
    entrypoints: string[];
    target: string;
    external: string[];
    plugins: {
      name: string;
      setup: (build: {
        onResolve: (
          filter: { filter: RegExp },
          callback: (args: { path: string }) => { path: string; namespace: string },
        ) => void;
        onLoad: (
          filter: { filter: RegExp; namespace: string },
          callback: (args: { path: string }) => { contents: string; loader: 'js' },
        ) => void;
      }) => void;
    }[];
  }) => Promise<{ success: boolean; logs: unknown[]; outputs: { text: () => Promise<string> }[] }>;
  plugin: (plugin: {
    name: string;
    setup: (build: {
      module: (specifier: string, callback: () => { exports: object; loader: 'object' }) => void;
    }) => void;
  }) => void;
};

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
  const module = process.versions.bun ? await importUnderBun(filePath) : await import(pathToFileURL(filePath).href);
  return decodeConfig2(module.default);
};

/**
 * Imports a config from inside the compiled CLI, whose runtime resolver cannot reach the plugin's
 * `node_modules` — so the config is bundled first, leaving no bare specifier to resolve.
 *
 * `effect` is held back from that bundle and served from this binary instead: a second copy would
 * brand the returned config's schema types against a different instance than the one decoding it.
 */
const importUnderBun = async (filePath: string): Promise<{ default: unknown }> => {
  const result = await Bun.build({
    entrypoints: [filePath],
    target: 'bun',
    external: ['effect', 'effect/*'],
    plugins: [
      {
        // Bun miscompiles the `export * from 'node:<mod>'` re-exports behind `@dxos/node-std/<mod>`
        // into a namespace binding it never emits, so the bundle dies with `node_<mod> is not
        // defined`; requiring the builtin directly sidesteps the shim a bun target does not need.
        name: 'node-std',
        setup: (build) => {
          build.onResolve({ filter: /^@dxos\/node-std\// }, (args) => ({ path: args.path, namespace: 'node-std' }));
          build.onLoad({ filter: /.*/, namespace: 'node-std' }, (args) => ({
            contents: `module.exports = require('node:${args.path.slice(NODE_STD_PREFIX.length)}');\n`,
            loader: 'js',
          }));
        },
      },
    ],
  });
  if (!result.success) {
    throw new Error(result.logs.map(String).join('\n'));
  }

  const code = await result.outputs[0].text();
  const specifiers = new Set(Array.from(code.matchAll(EXTERNAL_SPECIFIER), ([, specifier]) => specifier));
  Bun.plugin({
    name: 'dxos-embedded-effect',
    setup: (build) => {
      for (const specifier of specifiers) {
        const subpath = specifier.match(EFFECT_SPECIFIER)?.[1];
        const exports = subpath === undefined ? Effect : Reflect.get(Effect, subpath);
        if (typeof exports !== 'object' || exports === null) {
          throw new Error(`this build does not embed '${specifier}', which ${filePath} needs`);
        }

        build.module(specifier, () => ({ exports, loader: 'object' }));
      }
    },
  });

  // Written beside the config so a relative asset it references resolves as it would unbundled.
  const tempPath = join(filePath, '..', `.dx.config.${randomUUID()}.mjs`);
  try {
    await writeFile(tempPath, code, 'utf8');
    return await import(pathToFileURL(tempPath).href);
  } finally {
    await rm(tempPath, { force: true });
  }
};
