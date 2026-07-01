//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { type LoadedFile, compileEntry, executeScript } from '../compiler';
import { CodeOperation } from '../types';

/**
 * F-12a: build the project, then execute the emitted entry script inside a
 * console-capturing wrapper. On a non-clean build, returns the diagnostics
 * and empty I/O. Runtime errors are caught and surfaced via `stderr`; the
 * handler never raises.
 */
const handler: Operation.WithHandler<typeof CodeOperation.RunBuild> = CodeOperation.RunBuild.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project }) {
      const code = yield* Database.load(project);
      const fileRefs = code.files ?? [];

      const files: LoadedFile[] = [];
      for (const ref of fileRefs) {
        const file = yield* Database.load(ref);
        const text = yield* Database.load(file.content);
        files.push({ path: file.path, content: text.content ?? '' });
      }

      const build = yield* Effect.promise(() => compileEntry(files));
      if (!build.ok) {
        return {
          ok: false,
          stdout: [],
          stderr: [],
          diagnostics: build.diagnostics,
        };
      }

      const run = executeScript(build.entry.source);
      return {
        ok: run.ok,
        stdout: run.stdout,
        stderr: run.stderr,
        diagnostics: [],
      };
    }),
  ),
);

export default handler;
