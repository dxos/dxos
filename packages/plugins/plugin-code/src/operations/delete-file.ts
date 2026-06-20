//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, type Ref } from '@dxos/echo';

import { type SourceFile } from '#types';

import { CodeOperation } from '../types';

const handler: Operation.WithHandler<typeof CodeOperation.DeleteFile> = CodeOperation.DeleteFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project, path }) {
      const code = yield* Database.load(project);
      const fileRefs = code.files ?? [];
      const remaining: Ref.Ref<SourceFile.SourceFile>[] = [];
      let target: SourceFile.SourceFile | undefined;
      for (const ref of fileRefs) {
        const file = yield* Database.load(ref);
        if (file.path === path) {
          target = file;
        } else {
          remaining.push(ref);
        }
      }
      if (target) {
        Obj.update(code, (code) => {
          (code as Obj.Mutable<typeof code>).files = remaining;
        });
        yield* Database.remove(target);
        yield* Database.flush();
      }
      return { path, deleted: !!target };
    }),
  ),
);

export default handler;
