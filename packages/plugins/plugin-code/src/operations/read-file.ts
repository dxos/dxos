//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { ReadFile } from './definitions';

const handler: Operation.WithHandler<typeof ReadFile> = ReadFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project, path }) {
      const code = yield* Database.load(project);
      const fileRefs = code.files ?? [];
      for (const ref of fileRefs) {
        const file = yield* Database.load(ref);
        if (file.path === path) {
          const text = yield* Database.load(file.content);
          return { path: file.path, content: text.content };
        }
      }
      return yield* Effect.fail(new Error(`File not found: ${path}`));
    }),
  ),
);

export default handler;
