//
// Copyright 2025 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { type Script } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { DocAccessor, createDocAccessor } from '@dxos/echo-db';

import { Update } from './definitions';

export default Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn, name, description, edits }) {
      const loaded = yield* Database.load(fn);
      if (!loaded.source) {
        return yield* Effect.fail(new Error('Function has no source script.'));
      }
      const script = (yield* Database.load(loaded.source)) as Script.Script;

      if (name !== undefined || description !== undefined) {
        Obj.update(script, (script) => {
          if (name !== undefined) {
            script.name = name;
          }
          if (description !== undefined) {
            script.description = description;
          }
        });
      }

      if (edits && edits.length > 0) {
        const text = yield* Database.load(script.source);
        const accessor = createDocAccessor(text, ['content']);

        for (const edit of edits) {
          accessor.handle.change((doc: Doc<typeof text>) => {
            const source = DocAccessor.getValue<string>(accessor);
            if (edit.replaceAll) {
              let idx = source.indexOf(edit.oldString);
              while (idx !== -1) {
                A.splice(doc, accessor.path as A.Prop[], idx, edit.oldString.length, edit.newString);
                const updated = DocAccessor.getValue<string>(accessor);
                idx = updated.indexOf(edit.oldString, idx + edit.newString.length);
              }
            } else {
              const idx = source.indexOf(edit.oldString);
              if (idx === -1) {
                throw new Error(`Edit not found: ${JSON.stringify(edit.oldString)}`);
              }
              A.splice(doc, accessor.path as A.Prop[], idx, edit.oldString.length, edit.newString);
            }
          });
        }

        Obj.update(script, (script) => {
          script.changed = true;
        });
      }

      return {
        function: Obj.getDXN(loaded).toString(),
      };
    }),
  ),
);
