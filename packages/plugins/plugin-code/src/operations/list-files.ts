//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { CodeOperation } from '../types';

const handler: Operation.WithHandler<typeof CodeOperation.ListFiles> = CodeOperation.ListFiles.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project }) {
      const code = yield* Database.load(project);
      const fileRefs = code.files ?? [];
      const files = yield* Effect.all(
        fileRefs.map((ref) =>
          Effect.gen(function* () {
            const file = yield* Database.load(ref);
            const text = yield* Database.load(file.content);
            return { path: file.path, size: text.content.length };
          }),
        ),
      );
      const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
      return { files: sorted };
    }),
  ),
);

export default handler;
