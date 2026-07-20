//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { CollaborationOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';
import { Branch } from '@dxos/versioning';

import { Markdown } from '../types';

/** Splice `insert` over `[from, from+del)` on a Text and dispose any branch binding. */
const splice = (text: Text.Text, from: number, del: number, insert: string) => {
  const accessor = Doc.createAccessor(text, ['content']);
  accessor.handle.change((doc) => {
    A.splice(doc, accessor.path.slice(), from, del, insert);
  });
};

/**
 * Apply a text splice to a document's content, or to one of its branches when `branch` is set. The
 * inverse operation for accept/reject undo — restores the text they overwrote.
 */
const handler: Operation.WithHandler<typeof CollaborationOperation.RestoreText> =
  CollaborationOperation.RestoreText.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ subject, branch, from, del, insert }) {
        const document = Obj.instanceOf(Markdown.Document, subject) ? subject : undefined;
        const content = document
          ? yield* Effect.promise(() => document.content.load())
          : Obj.instanceOf(Text.Text, subject)
            ? subject
            : undefined;
        if (!content) {
          return;
        }

        if (!branch) {
          splice(content, from, del, insert);
          return;
        }

        const record = document?.history?.branches.find((entry) => entry.key === branch);
        if (!document || !record) {
          return;
        }
        const binding = yield* Effect.promise(() => Branch.bind(document, record));
        try {
          splice(binding.object, from, del, insert);
        } finally {
          binding.dispose();
        }
      }),
    ),
  );

export default handler;
