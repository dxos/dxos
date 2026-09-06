//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { Attention } from '@dxos/react-ui-attention/types';
import { AnchoredTo, Thread } from '@dxos/types';

import { CommentCapabilities, CommentOperation } from '#types';

const handler: Operation.WithHandler<typeof CommentOperation.Create> = CommentOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, anchor: anchorProp, range, subject, branch, text, sender }) {
      const _anchor = range ? yield* anchorFromRange(subject, range) : anchorProp;
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(CommentCapabilities.State);
      const subjectId = Obj.getURI(subject);

      // Inherit the markdown plugin's `commentAgentMode` setting when the
      // subject is a Markdown.Document, so new comment threads on docs are
      // opted-in (or not) based on the user's preference. Non-markdown
      // subjects always get an un-opted thread (no agent).
      const markdownSettingsAtoms = yield* Capability.getAll(MarkdownCapabilities.Settings);
      const markdownSettingsAtom = markdownSettingsAtoms[0];
      const commentAgentMode =
        markdownSettingsAtom && Obj.instanceOf(Markdown.Document, subject)
          ? registry.get(markdownSettingsAtom).commentAgentMode
          : undefined;
      const agent =
        commentAgentMode && commentAgentMode !== 'off' ? { enabled: true, mode: commentAgentMode } : undefined;

      const thread = Thread.make({ name, agent });
      const anchor = Relation.make(AnchoredTo.AnchoredTo, {
        [Relation.Source]: thread,
        [Relation.Target]: subject,
        anchor: _anchor,
        branch,
      });

      const state = registry.get(stateAtom);
      const existingDrafts = state.drafts[subjectId];
      registry.set(stateAtom, {
        ...state,
        drafts: {
          ...state.drafts,
          [subjectId]: existingDrafts ? [...existingDrafts, anchor] : [anchor],
        },
      });

      yield* Operation.invoke(CommentOperation.Select, { current: Obj.getURI(thread) });
      yield* Operation.invoke(LayoutOperation.UpdateCompanion, {
        subject: Attention.linkedSegment('comments'),
      });
      if (text === undefined) {
        return { threadId: thread.id, anchorId: anchor.id };
      }

      yield* Operation.invoke(CommentOperation.AddMessage, { subject, anchor, sender: sender ?? {}, text });
      // Submitting persists a new relation in place of the draft, so the id a caller can act on is
      // the one now in the database.
      const db = Obj.getDatabase(subject);
      const persisted = db
        ? (yield* Effect.promise(() =>
            db.query(Query.select(Filter.id(subject.id)).targetOf(AnchoredTo.AnchoredTo)).run(),
          )).find((candidate: AnchoredTo.AnchoredTo) => {
            try {
              return Relation.getSource(candidate).id === thread.id;
            } catch {
              return false;
            }
          })
        : undefined;
      return { threadId: thread.id, anchorId: persisted?.id ?? anchor.id };
    }),
  ),
);

export default handler;

/** The cursor anchor for a character range of a markdown document, as the editor's comment action makes it. */
const anchorFromRange = Effect.fnUntraced(function* (subject: Obj.Unknown, range: { from: number; to: number }) {
  if (!Obj.instanceOf(Markdown.Document, subject)) {
    return yield* Effect.fail(new Error('A range anchor needs a markdown document as the subject.'));
  }
  const content = yield* Effect.promise(() => subject.content.load());
  return toCursorRange(Doc.createAccessor(content, ['content']), range.from, range.to);
});
