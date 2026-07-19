//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { CollaborationOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { getRangeFromCursor } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { revertHunk } from '@dxos/ui-editor';
import { Branch } from '@dxos/versioning';

import { Markdown } from '../types';

/**
 * Reject an individual change from `branch` at an anchored region — revert that hunk on the author's
 * branch back to the base (main), so the suggestion disappears. The reject counterpart to
 * `accept-change`: accept splices the branch's version into the base; reject splices the base back
 * into the branch. Recomputes the LATEST diff between the base content and the branch, finds the hunk
 * overlapping the anchor (a range in the base), and splices the base text into the branch there.
 * No-op if the anchor no longer maps to a changed hunk.
 */
const handler: Operation.WithHandler<typeof CollaborationOperation.RejectChange> =
  CollaborationOperation.RejectChange.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ subject, anchor, branch }) {
        // Reject reverts a change on a document's branch, so it needs the owning Document (for its
        // branch registry), not a bare Text.
        const document = Obj.instanceOf(Markdown.Document, subject) ? subject : undefined;
        if (!document) {
          return;
        }
        const content = yield* Effect.promise(() => document.content.load());

        // The anchor is expressed against the base (main) content.
        const accessor = Doc.createAccessor(content, ['content']);
        const range = getRangeFromCursor(accessor, anchor);
        if (!range) {
          return;
        }

        // Bind the author's branch (writable) and revert the hunk overlapping the base range.
        const record = document.history?.branches.find((entry) => entry.key === branch);
        if (!record) {
          return;
        }
        const binding = yield* Effect.promise(() => Branch.bind(document, record));
        try {
          const branchText = binding.object;
          const splice = revertHunk(content.content, branchText.content, range);
          if (!splice) {
            return;
          }
          const branchAccessor = Doc.createAccessor(branchText, ['content']);
          branchAccessor.handle.change((doc) => {
            A.splice(doc, branchAccessor.path.slice(), splice.from, splice.del, splice.insert);
          });
        } finally {
          binding.dispose();
        }
      }),
    ),
  );

export default handler;
