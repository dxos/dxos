//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref, Text } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Branch } from '@dxos/versioning';

import { Markdown, MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.Update> = MarkdownOperation.Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, edits, branchId }) {
      // Untyped load (like `Open`) so any text-bearing document — an object holding a
      // `content: Ref(Text)` — is editable, not only `Markdown.Document` (e.g. outlines).
      const document = yield* Database.load(doc);
      const contentRef = Obj.getValue(document, ['content']);
      invariant(Ref.isRef(contentRef), 'Not a text-bearing document.');
      const content = yield* Database.load(contentRef);

      // Branch-scoped edits write through a per-surface binding: the live document (and every
      // other surface) is unaffected until the branch is merged. Branching is markdown-only —
      // the typed resolve is deliberate here, since `history` lives on `Markdown.Document`.
      if (branchId) {
        const markdownDoc = yield* Database.resolve(Obj.getURI(document), Markdown.Document);
        const branch = markdownDoc.history?.branches.find((candidate) => candidate.id === branchId);
        invariant(branch, `branch not found: ${branchId}`);
        const binding = yield* Effect.promise(() => Branch.bind(markdownDoc, branch));
        try {
          let newContent = '';
          Obj.update(binding.object, () => {
            newContent = Text.apply(binding.object, 'content', edits);
          });
          return { newContent };
        } finally {
          binding.dispose();
        }
      }

      // `Text.apply` treats a missing/empty `oldString` as append-to-end, matching the Update schema.
      let newContent = '';
      Obj.update(content, () => {
        newContent = Text.apply(content, 'content', edits);
      });
      return { newContent };
    }),
  ),
);

export default handler;
