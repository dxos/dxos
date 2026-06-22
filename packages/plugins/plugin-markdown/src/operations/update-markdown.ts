//
// Copyright 2025 DXOS.org
//

import { next as A, type Doc as AutomergeDoc } from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { DocAccessor } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';

import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.Update> = MarkdownOperation.Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, edits }) {
      const content = yield* doc.pipe(
        Database.load,
        Effect.map((_) => _.content),
        Effect.flatMap(Database.load),
      );

      const accessor = Doc.createAccessor(content, ['content']);
      for (const edit of edits) {
        accessor.handle.change((doc: AutomergeDoc<typeof content>) => {
          const text = DocAccessor.getValue<string>(accessor);
          if (edit.replaceAll) {
            let idx = text.indexOf(edit.oldString);
            while (idx !== -1) {
              A.splice(doc, accessor.path as A.Prop[], idx, edit.oldString.length, edit.newString);
              const updated = DocAccessor.getValue<string>(accessor);
              idx = updated.indexOf(edit.oldString, idx + edit.newString.length);
            }
          } else {
            const idx = text.indexOf(edit.oldString);
            if (idx === -1) {
              throw new Error(`Edit not found: ${JSON.stringify(edit.oldString)}`);
            }
            A.splice(doc, accessor.path as A.Prop[], idx, edit.oldString.length, edit.newString);
          }
        });
      }

      return {
        newContent: DocAccessor.getValue<string>(accessor),
      };
    }),
  ),
);

export default handler;
