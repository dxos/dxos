//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { CodeOperation } from '../types';

const handler: Operation.WithHandler<typeof CodeOperation.ResetProject> = CodeOperation.ResetProject.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project }) {
      const code = yield* Database.load(project);
      const fileRefs = code.files ?? [];
      const removed = fileRefs.length;

      const targets = [];
      for (const ref of fileRefs) {
        targets.push(yield* Database.load(ref));
      }

      Obj.update(code, (code) => {
        (code as Obj.Mutable<typeof code>).files = [];
      });

      for (const target of targets) {
        yield* Database.remove(target);
      }
      if (removed > 0) {
        yield* Database.flush();
      }

      return { removed };
    }),
  ),
);

export default handler;
