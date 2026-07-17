//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { CollaborationOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { type DecodedAutomergePrimaryValue, getObjectOnBranch, getRangeFromCursor } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';
import { cherryPickHunk } from '@dxos/ui-editor';

import { Markdown } from '../types';

/** Narrow a decoded automerge value to a keyed record so string fields can be read without a cast. */
const isRecord = (value: unknown): value is { readonly [key: string]: DecodedAutomergePrimaryValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Accept an individual change from `branch` at an anchored region — a partial cherry-pick into the
 * current branch, without merging the whole branch. Recomputes the LATEST diff between the current
 * (bound) content and the compare branch, finds the hunk overlapping the anchor, and splices the
 * compare branch's current text in. No-op if the anchor no longer maps to a changed hunk.
 */
const handler: Operation.WithHandler<typeof CollaborationOperation.AcceptChange> =
  CollaborationOperation.AcceptChange.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ subject, anchor, branch }) {
        // The editable Text (a document's content child, or a bare Text subject).
        const content = Obj.instanceOf(Markdown.Document, subject)
          ? yield* Effect.promise(() => subject.content.load())
          : Obj.instanceOf(Text.Text, subject)
            ? subject
            : undefined;
        if (!content) {
          return;
        }

        const accessor = Doc.createAccessor(content, ['content']);
        const range = getRangeFromCursor(accessor, anchor);
        if (!range) {
          return;
        }

        // Pull the LATEST compare-branch text and recompute the diff (not a stored snapshot). Widen to
        // `unknown` so the record guard narrows cleanly (the decoded union member types lack `content`).
        const data: unknown = yield* Effect.promise(() => getObjectOnBranch(content, branch));
        const compareText = isRecord(data) && typeof data.content === 'string' ? data.content : '';

        // Find the hunk overlapping the anchored range and cherry-pick the compare branch's version.
        const splice = cherryPickHunk(content.content, compareText, range);
        if (!splice) {
          return;
        }

        accessor.handle.change((doc) => {
          A.splice(doc, accessor.path.slice(), splice.from, splice.del, splice.insert);
        });
      }),
    ),
  );

export default handler;
