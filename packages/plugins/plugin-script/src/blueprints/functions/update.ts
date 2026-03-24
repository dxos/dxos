//
// Copyright 2025 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { DocAccessor, createDocAccessor } from '@dxos/echo-db';
import { Operation } from '@dxos/operation';

import { Update } from './definitions';

export default Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ script, name, description, edits }) {
      const loaded = yield* Database.load(script);

      if (name !== undefined || description !== undefined) {
        Obj.change(loaded, (draft) => {
          if (name !== undefined) {
            draft.name = name;
          }
          if (description !== undefined) {
            draft.description = description;
          }
        });
      }

      if (edits && edits.length > 0) {
        const text = yield* Database.load(loaded.source);
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

        Obj.change(loaded, (draft) => {
          draft.changed = true;
        });
      }

      return {
        id: Obj.getDXN(loaded).toString(),
      };
    }),
  ),
);
