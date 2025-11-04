//
// Copyright 2025 DXOS.org
//

import { writeFile } from 'node:fs/promises';

import { build } from 'esbuild';
import { describe, test } from 'vitest';

// Checks that packages can be used in different environments.

describe('build tests', () => {
  test('workerd', async () => {
    await runEnvTest({
      imports: [
        // Place import specifiers that must be running at EDGE here.
        // NOTE: They also need to be added to package.json of this package.
        '@dxos/echo-db',
        '@dxos/conductor',
        '@dxos/echo',
        '@dxos/keys',
        '@dxos/log',
      ],
      conditions: ['workerd', 'worker', 'browser'],
      external: ['*.wasm', 'node:async_hook'],
      forbid: [
        // Place patterns that must not appear in the bundle here, e.g. packages known to not be compatible with workerd.
        // NOTE: Patterns are matched against .pnpm store: ../../../node_modules/.pnpm/parjs@1.3.9/node_modules/parjs/dist/internal/parsers/string-len.js
        //       ...or local file paths: ../../ui/react-ui-table/dist/lib/browser/types/index.mjs
        /sodium-native/,
        /protobufjs/,
        /@xenova\+transformers/,
      ],
    });
  });
});

type EnvTestConfig = {
  imports: string[];
  conditions: string[];
  external?: string[];
  forbid: RegExp[];
};

const runEnvTest = async (config: EnvTestConfig): Promise<void> => {
  const result = await build({
    entryPoints: ['test:entry'],
    bundle: true,
    write: false,
    metafile: true,
    conditions: config.conditions,
    external: config.external,
    plugins: [
      {
        name: 'test-plugin',
        setup: (build) => {
          build.onResolve({ filter: /^test:entry$/ }, async (args) => ({
            path: args.path,
            namespace: 'test-plugin',
          }));
          build.onLoad({ filter: /^test:entry$/, namespace: 'test-plugin' }, async (args) => ({
            loader: 'ts',
            contents: config.imports
              .map((specifier, idx) => `export * as test${idx} from ${JSON.stringify(specifier)};`)
              .join('\n'),
            resolveDir: import.meta.dirname,
          }));
        },
      },
    ],
  });

  const problems: string[] = [];
  for (const input of Object.keys(result.metafile.inputs)) {
    if (config.forbid.some((pattern) => pattern.test(input))) {
      problems.push(input);
    }
  }

  if (problems.length > 0) {
    const path = `/tmp/${Date.now()}.meta.json`;
    await writeFile(path, JSON.stringify(result.metafile, null, 2));
    throw new Error(
      `Found forbidden imports:\n${problems.join('\n')}\n\nMetafile written to ${path} for details.\nUse bundle analyzer to see what's included in the bundle: https://esbuild.github.io/analyze/`,
    );
  }
};
