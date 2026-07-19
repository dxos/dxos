//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Text } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Branch } from '@dxos/versioning';

import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.Update> = MarkdownOperation.Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, edits, branchId }) {
      const document = yield* Database.load(doc);
      const content = yield* Database.load(document.content);

      // Branch-scoped edits write through a per-surface binding: the live document (and every
      // other surface) is unaffected until the branch is merged.
      if (branchId) {
        const branch = document.history?.branches.find((candidate) => candidate.id === branchId);
        invariant(branch, `branch not found: ${branchId}`);
        const binding = yield* Effect.promise(() => Branch.bind(document, branch));
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
