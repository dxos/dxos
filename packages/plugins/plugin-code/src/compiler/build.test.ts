//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LoadedFile, compileEntry, executeScript } from './build';
import { resetCompiler } from './singleton';

// Skipped from default fast-CI; opt in with VITEST_TAGS_FILTER="llm || compiler".
// The first compileEntry call fetches lib.d.ts from the playground CDN (~5s)
// which is impractical for the default unit-test loop. Subsequent calls reuse
// the module-level Compiler instance and are fast (<200ms typically).
const HELLO_SOURCE = `//
// Copyright 2026 DXOS.org
//

export const main = (): void => {
  console.log('Hello, World!');
};

main();
`;

describe.concurrent('compileEntry', { tags: ['compiler'] }, () => {
  test('emits JS for the hello-world scaffold', async ({ expect }) => {
    resetCompiler();
    const files: LoadedFile[] = [{ path: 'src/hello.ts', content: HELLO_SOURCE }];
    const result = await compileEntry(files);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.path).toBe('src/hello.ts');
      expect(result.entry.source).toContain("'Hello, World!'");
      // No remaining TypeScript-only syntax in the emitted JS.
      expect(result.entry.source).not.toMatch(/: void/);
      expect(result.diagnostics).toEqual([]);
    }
  });

  test('reports a diagnostic when no entry exists', async ({ expect }) => {
    const result = await compileEntry([]);
    expect(result.ok).toBe(false);
    expect(result.entry).toBeUndefined();
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].severity).toBe('error');
    expect(result.diagnostics[0].message).toMatch(/No entry file/);
  });

  test('reports diagnostics for syntactically invalid entry', async ({ expect }) => {
    const broken: LoadedFile[] = [{ path: 'src/hello.ts', content: 'export const x: number = "not a number";\n' }];
    const result = await compileEntry(broken);
    expect(result.ok).toBe(false);
    expect(result.entry).toBeUndefined();
    expect(result.diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(true);
  });

  test('prefers src/hello.ts when both candidates exist', async ({ expect }) => {
    const files: LoadedFile[] = [
      { path: 'src/plugin.ts', content: "console.log('plugin');\n" },
      { path: 'src/hello.ts', content: "console.log('hello');\n" },
    ];
    const result = await compileEntry(files);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.path).toBe('src/hello.ts');
      // Either F-12a's TS emit (single-quoted) or F-12b's esbuild emit
      // (double-quoted) is acceptable — both contain the literal `hello`.
      expect(result.entry.source).toMatch(/['"]hello['"]/);
    }
  });

  test('falls back to src/plugin.ts when hello is absent', async ({ expect }) => {
    const files: LoadedFile[] = [{ path: 'src/plugin.ts', content: "console.log('plugin');\n" }];
    const result = await compileEntry(files);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.path).toBe('src/plugin.ts');
    }
  });
});

describe.concurrent('executeScript', () => {
  test('captures console.log into stdout', ({ expect }) => {
    const result = executeScript("console.log('Hello, World!');");
    expect(result.ok).toBe(true);
    expect(result.stdout).toEqual(['Hello, World!']);
    expect(result.stderr).toEqual([]);
  });

  test('joins multiple arguments with spaces', ({ expect }) => {
    const result = executeScript("console.log('one', 'two', 3);");
    expect(result.ok).toBe(true);
    expect(result.stdout).toEqual(['one two 3']);
  });

  test('captures console.error into stderr', ({ expect }) => {
    const result = executeScript("console.error('boom');");
    expect(result.ok).toBe(true);
    expect(result.stderr).toEqual(['boom']);
    expect(result.stdout).toEqual([]);
  });

  test('captures thrown errors without raising', ({ expect }) => {
    const result = executeScript("throw new Error('runtime fail');");
    expect(result.ok).toBe(false);
    expect(result.stderr).toHaveLength(1);
    expect(result.stderr[0]).toMatch(/runtime fail/);
  });

  test('does not mutate global console', ({ expect }) => {
    const originalLog = console.log;
    executeScript("console.log('observed');");
    expect(console.log).toBe(originalLog);
  });

  test('isolates buffers across calls (no concurrent leak)', ({ expect }) => {
    const a = executeScript("console.log('A');");
    const b = executeScript("console.log('B');");
    expect(a.stdout).toEqual(['A']);
    expect(b.stdout).toEqual(['B']);
  });

  test('returns ok:false when script throws after some output', ({ expect }) => {
    const result = executeScript(`
      console.log('first');
      console.log('second');
      throw new Error('boom');
    `);
    expect(result.ok).toBe(false);
    expect(result.stdout).toEqual(['first', 'second']);
    expect(result.stderr[0]).toMatch(/boom/);
  });
});

describe('compile + execute round-trip', { tags: ['compiler'] }, () => {
  test('hello-world scaffold prints "Hello, World!"', async ({ expect }) => {
    const files: LoadedFile[] = [{ path: 'src/hello.ts', content: HELLO_SOURCE }];
    const build = await compileEntry(files);
    expect(build.ok).toBe(true);
    if (build.ok) {
      const run = executeScript(build.entry.source);
      expect(run.ok).toBe(true);
      expect(run.stdout).toContain('Hello, World!');
      expect(run.stderr).toEqual([]);
    }
  });

  test('does not leak files between consecutive builds', async ({ expect }) => {
    // First build: a leaky module the second build does NOT include.
    const buildA: LoadedFile[] = [
      { path: 'src/leak.ts', content: 'export const VALUE = 1; const _x: number = "no";\n' },
    ];
    const a = await compileEntry(buildA);
    // We expect this to fail (string assigned to number) — drives the test.
    expect(a.ok).toBe(false);

    // Second build: only hello.ts. If src/leak.ts lingered in the language-
    // service program, its diagnostics would surface here and the build
    // would (incorrectly) fail.
    const buildB: LoadedFile[] = [{ path: 'src/hello.ts', content: HELLO_SOURCE }];
    const b = await compileEntry(buildB);
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(b.diagnostics).toEqual([]);
    }
  });
});
