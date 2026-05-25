//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { compileEntry, type LoadedFile } from '../compiler';
import { CodeOperation } from '../types';

/**
 * F-12a: single-file TypeScript transpile via the @typescript/vfs language
 * service. The handler picks an entry file (`src/hello.ts` if present, else
 * `src/plugin.ts`), feeds every project SourceFile into the compiler, then
 * emits + reports diagnostics for the entry.
 *
 * F-12b will branch on file count / import presence to use esbuild-wasm for
 * multi-file bundling while keeping the language service as the source of
 * type-check diagnostics.
 */
const handler: Operation.WithHandler<typeof CodeOperation.BuildProject> = CodeOperation.BuildProject.pipe(
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

      return yield* Effect.promise(() => compileEntry(files));
    }),
  ),
);

export default handler;
