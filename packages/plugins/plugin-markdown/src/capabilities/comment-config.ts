//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj, Type } from '@dxos/echo';
import { createDocAccessor, getObjectOnBranch, getRangeFromCursor, getTextInRange } from '@dxos/echo-client';
import { Text } from '@dxos/schema';
import { cherryPickHunk, createComment as createCommentCommand } from '@dxos/ui-editor';

import { MarkdownCapabilities, MarkdownOperation } from '#types';
import { Markdown } from '#types';

// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).
const activate: () => Effect.Effect<
  Capability.Capability<typeof AppCapabilities.CommentConfig>,
  never,
  Capability.Service
> = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;
  const config: AppCapabilities.CommentConfig = {
    id: Type.getTypename(Markdown.Document),
    comments: 'anchored',
    selectionMode: 'multi-range',
    getAnchorLabel: (doc: Markdown.Document, anchor: string): string | undefined => {
      if (doc.content) {
        const [start, end] = anchor.split(':');
        return getTextInRange(createDocAccessor(doc.content.target!, ['content']), start, end);
      }
    },
    scrollToAnchor: MarkdownOperation.ScrollToAnchor,
    // Route through the live editor so the anchor snaps to the diff hunk under the cursor (else the
    // word) and the thread is branch-tagged by the editor's comment extension. The view registry is
    // keyed by attendable id, so look it up by document id (the object URI).
    createComment: (doc: Markdown.Document): boolean => {
      const view = capabilities.getAll(MarkdownCapabilities.EditorViews)[0]?.getByDocumentId(Obj.getURI(doc))?.view;
      if (view) {
        createCommentCommand(view);
        return true;
      }
      return false;
    },
    // Cherry-pick the latest text hunk at the anchored range from `branch` into the current branch's
    // bound Text. Recomputes the diff against the live compare-branch content (not a snapshot).
    acceptChange: async (subject: Markdown.Document | Text.Text, anchor: string, branch: string): Promise<void> => {
      const content = Obj.instanceOf(Markdown.Document, subject)
        ? await subject.content.load()
        : Obj.instanceOf(Text.Text, subject)
          ? subject
          : undefined;
      if (!content) {
        return;
      }

      const accessor = createDocAccessor(content, ['content']);
      const range = getRangeFromCursor(accessor, anchor);
      if (!range) {
        return;
      }

      const compareData = await getObjectOnBranch(content, branch);
      const compareText = String(compareData?.content ?? '');
      const splice = cherryPickHunk(content.content, compareText, range);
      if (!splice) {
        return;
      }

      accessor.handle.change((doc: A.Doc<any>) => {
        A.splice(doc, accessor.path.slice(), splice.from, splice.del, splice.insert);
      });
    },
    // Whether the anchored range currently overlaps a diff hunk against `branch` (drives the accept UI).
    isOnChange: async (subject: Markdown.Document | Text.Text, anchor: string, branch: string): Promise<boolean> => {
      const content = Obj.instanceOf(Markdown.Document, subject)
        ? await subject.content.load()
        : Obj.instanceOf(Text.Text, subject)
          ? subject
          : undefined;
      if (!content) {
        return false;
      }
      const accessor = createDocAccessor(content, ['content']);
      const range = getRangeFromCursor(accessor, anchor);
      if (!range) {
        return false;
      }
      const compareData = await getObjectOnBranch(content, branch);
      const compareText = String(compareData?.content ?? '');
      return cherryPickHunk(content.content, compareText, range) !== undefined;
    },
  };
  return Capability.contributes(AppCapabilities.CommentConfig, config);
});

export default activate;
