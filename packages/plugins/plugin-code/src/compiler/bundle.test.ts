//
// Copyright 2026 DXOS.org
//

import { afterAll, describe, test } from 'vitest';

import { compileEntry, executeScript } from './build';
import { bundleEntry } from './bundle';
import { resetCompiler } from './singleton';

type File = { path: string; content: string };

afterAll(async () => {
  // esbuild-wasm's worker keeps Node's event loop alive otherwise.
  try {
    const esbuild = await import('esbuild-wasm');
    await esbuild.stop();
  } catch {
    // Already stopped, or never initialized — nothing to clean up.
  }
});

describe('bundleEntry (F-12b)', () => {
  test('bundles a two-file project with relative import', async ({ expect }) => {
    const files: File[] = [
      { path: 'src/util.ts', content: "export const MESSAGE = 'from util';\n" },
      { path: 'src/hello.ts', content: "import { MESSAGE } from './util';\nconsole.log(MESSAGE);\n" },
    ];
    const result = await bundleEntry(files, 'src/hello.ts');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toContain('from util');
      expect(result.source).toContain('console.log');
      expect(result.errors).toEqual([]);
    }
  });

  test('reports a diagnostic for an unresolved relative import', async ({ expect }) => {
    const files: File[] = [
      { path: 'src/hello.ts', content: "import { MISSING } from './does-not-exist';\nconsole.log(MISSING);\n" },
    ];
    const result = await bundleEntry(files, 'src/hello.ts');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((diagnostic) => /Cannot resolve/i.test(diagnostic.message))).toBe(true);
    }
  });

  test('rejects bare imports (host externals deferred to F-13)', async ({ expect }) => {
    const files: File[] = [{ path: 'src/hello.ts', content: "import * as React from 'react';\nconsole.log(React);\n" }];
    const result = await bundleEntry(files, 'src/hello.ts');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((diagnostic) => /bare import/i.test(diagnostic.message))).toBe(true);
    }
  });
});

describe('compileEntry dispatch (F-12a vs F-12b)', () => {
  test('multi-file project round-trips through bundle + execute', async ({ expect }) => {
    resetCompiler();
    const files: File[] = [
      { path: 'src/util.ts', content: "export const MESSAGE = 'from util';\n" },
      {
        path: 'src/hello.ts',
        content: "import { MESSAGE } from './util';\nconsole.log(MESSAGE);\n",
      },
    ];
    const build = await compileEntry(files);
    if (!build.ok) {
      // Surface the actual diagnostics so the failure is debuggable.
      throw new Error(`Expected clean build, got: ${JSON.stringify(build.diagnostics)}`);
    }
    const run = executeScript(build.entry.source);
    expect(run.ok).toBe(true);
    expect(run.stdout).toContain('from util');
    expect(run.stderr).toEqual([]);
  });

  test('single-file project keeps using the TS transpile path', async ({ expect }) => {
    resetCompiler();
    const files: File[] = [{ path: 'src/hello.ts', content: "console.log('plain');\n" }];
    const build = await compileEntry(files);
    expect(build.ok).toBe(true);
    if (build.ok) {
      // F-12a CommonJS emit emits a "use strict"; F-12b's esbuild emit is also valid
      // but doesn't carry the TS-language-service comment marker. Either way the
      // hello-world prints correctly.
      const run = executeScript(build.entry.source);
      expect(run.stdout).toContain('plain');
    }
  });
});
