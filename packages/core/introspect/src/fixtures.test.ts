//
// Copyright 2026 DXOS.org
//

// Verifies the fixture monorepo is well-formed.
//
// The fixtures aren't part of the workspace (excluded from pnpm-workspace.yaml
// and tsconfig) so they don't get type-checked by the normal build. This test
// loads each fixture file through ts-morph and reports any *syntactic*
// diagnostics — catches malformed fixtures (typos, syntax errors, broken
// declarations) without depending on live types being resolvable.
//
// We deliberately don't run full semantic typecheck here: the fixtures import
// `@dxos/*`/`effect`/`react` etc., and reproducing a working tsconfig with all
// transitive types resolved is more setup than the test is worth. Real type
// errors caught at the call site of the actual `@dxos/introspect` package
// remain caught by the package's own build.

import { glob } from 'glob';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, ScriptTarget } from 'ts-morph';
import { describe, test } from 'vitest';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURE_ROOT = join(__dirname, '__fixtures__');

describe('fixture monorepo wellformedness', { timeout: 30_000 }, () => {
  test('every fixture .ts(x) file parses without syntactic errors', ({ expect }) => {
    const files = glob.sync('packages/**/src/**/*.{ts,tsx}', {
      cwd: FIXTURE_ROOT,
      absolute: true,
      nodir: true,
    });
    expect(files.length).toBeGreaterThan(0);

    const project = new Project({
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: true,
      compilerOptions: {
        target: ScriptTarget.ESNext,
        // JsxEmit.ReactJSX = 4 — referenced by literal because JsxEmit isn't re-exported as a value by ts-morph.
        jsx: 4,
        noEmit: true,
        skipLibCheck: true,
      },
    });

    const errors: string[] = [];
    for (const filePath of files) {
      const source = project.addSourceFileAtPath(filePath);
      for (const diag of source.getPreEmitDiagnostics()) {
        const category = diag.getCategory();
        // Category 1 = Error. Filter to syntactic-style errors via diagnostic code:
        // codes < 2000 are syntactic in TypeScript's numbering.
        if (category !== 1 || diag.getCode() >= 2000) {
          continue;
        }
        const start = diag.getStart();
        const lineCol = start !== undefined ? source.getLineAndColumnAtPos(start) : undefined;
        const message = diag.getMessageText();
        const text = typeof message === 'string' ? message : message.getMessageText();
        errors.push(`${filePath}${lineCol ? `:${lineCol.line}:${lineCol.column}` : ''} TS${diag.getCode()}: ${text}`);
      }
      // Sanity: the file must contain at least one top-level `export`. Catches
      // accidental empty files. We textually search rather than relying on
      // `getExportedDeclarations`, which can return 0 for barrel files when
      // re-export targets aren't loaded into the project.
      if (!/^\s*export\b/m.test(source.getFullText())) {
        errors.push(`${filePath}: file contains no \`export\` statement`);
      }
    }

    if (errors.length > 0) {
      expect.fail(`Fixture monorepo has ${errors.length} issue(s):\n${errors.slice(0, 10).join('\n')}`);
    }
  });
});
