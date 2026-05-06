//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { SourceFile } from '#types';

import { WriteFile } from './definitions';

const handler: Operation.WithHandler<typeof WriteFile> = WriteFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project, path, content }) {
      const code = yield* Database.load(project);
      const fileRefs = code.files ?? [];

      for (const ref of fileRefs) {
        const file = yield* Database.load(ref);
        if (file.path === path) {
          const text = yield* Database.load(file.content);
          Obj.update(text, (text) => {
            (text as Obj.Mutable<typeof text>).content = content;
          });
          return { path, created: false };
        }
      }

      const file = SourceFile.make({ path, content });
      const added = yield* Database.add(file);
      Obj.update(code, (code) => {
        const next = [...(code.files ?? []), Ref.make(added)];
        (code as Obj.Mutable<typeof code>).files = next;
      });
      return { path, created: true };
    }),
  ),
);

export default handler;
