//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, type Ref } from '@dxos/echo';

import { type SourceFile } from '#types';

import { DeleteFile } from './definitions';

const handler: Operation.WithHandler<typeof DeleteFile> = DeleteFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project, path }) {
      const code = yield* Database.load(project);
      const fileRefs = code.files ?? [];
      const remaining: Ref.Ref<SourceFile.SourceFile>[] = [];
      let deleted = false;
      for (const ref of fileRefs) {
        const file = yield* Database.load(ref);
        if (file.path === path) {
          deleted = true;
        } else {
          remaining.push(ref);
        }
      }
      if (deleted) {
        Obj.update(code, (code) => {
          (code as Obj.Mutable<typeof code>).files = remaining;
        });
      }
      return { path, deleted };
    }),
  ),
);

export default handler;
