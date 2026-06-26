//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { Doc, applyEdits, type Edit as DocEdit } from '@dxos/echo-doc';

import { MarkdownOperation } from '../types';

type MarkdownEdit = (typeof MarkdownOperation.Update)['input']['Type']['edits'][number];

/**
 * Applies markdown edits, treating undefined/empty `oldString` as append-to-end per the Update schema.
 */
const applyMarkdownEdits = (accessor: Doc.Accessor, edits: readonly MarkdownEdit[]): string => {
  for (const edit of edits) {
    if (edit.oldString == null || edit.oldString.length === 0) {
      accessor.handle.change((doc) => {
        const text = Doc.getValue<string>(accessor);
        // Echo-doc accessor paths are structurally Automerge props; no typed bridge is exported.
        A.splice(doc, accessor.path as A.Prop[], text.length, 0, edit.newString);
      });
    } else {
      const docEdit: DocEdit = {
        oldString: edit.oldString,
        newString: edit.newString,
        replaceAll: edit.replaceAll,
      };
      applyEdits(accessor, [docEdit]);
    }
  }

  return Doc.getValue<string>(accessor);
};

const handler: Operation.WithHandler<typeof MarkdownOperation.Update> = MarkdownOperation.Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, edits }) {
      const content = yield* doc.pipe(
        Database.load,
        Effect.map((_) => _.content),
        Effect.flatMap(Database.load),
      );

      const accessor = Doc.createAccessor(content, ['content']);
      const newContent = applyMarkdownEdits(accessor, edits);
      return { newContent };
    }),
  ),
);

export default handler;
