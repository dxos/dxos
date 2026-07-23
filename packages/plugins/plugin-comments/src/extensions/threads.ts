//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Atom, type Registry } from '@effect-atom/atom-react';

import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { getTextInRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { OperationInvoker } from '@dxos/operation';
import { type Markdown } from '@dxos/plugin-markdown';
import { type Text } from '@dxos/schema';
import { AnchoredTo, Thread } from '@dxos/types';
import { comments } from '@dxos/ui-editor';

import { CommentOperation } from '#types';
import { type CommentState } from '#types';

// Resolve the anchor snippet against the document the editor produced the cursor from: the branch
// content Text in Branch view, else main. Resolving a branch-doc cursor against main throws (the
// automerge op is absent), so a stale/foreign cursor is tolerated rather than crashing.
// TODO(burdon): Factor out.
const getName = (text: Text.Text | undefined, anchor: string): string | undefined => {
  if (!text) {
    return undefined;
  }
  const [start, end] = anchor.split(':');
  try {
    return getTextInRange(Doc.createAccessor(text, ['content']), start, end);
  } catch {
    return undefined;
  }
};

export type ThreadStore = {
  registry: Registry.Registry;
  stateAtom: Atom.Writable<CommentState>;
};

export type ThreadsOptions = {
  // The active review branch (the core branch the editor is showing); undefined = main. Threaded from
  // the markdown editor (which resolves it from the per-object version selection) rather than read
  // from core `getCurrentBranch`, which stays 'main' under this branch's per-surface binding model.
  reviewBranch?: string;
  // The branch content Text the editor is bound to in Branch view; undefined on main/diff. Comment
  // anchors resolve against it.
  branchText?: Text.Text;
  // The active branch is a per-user suggestion branch: inline comment creation is prohibited.
  suggestionBranch?: boolean;
  // Whether comment marks/creation render at all (per the review policy); `false` hides comments
  // entirely (e.g. a distraction-free reading mode). Defaults to shown.
  showComments?: boolean;
};

/**
 * Construct comment-sync editor extensions for a document.
 */
export const threads = (
  store: ThreadStore,
  doc?: Markdown.Document,
  invokePromise?: OperationInvoker.OperationInvoker['invokePromise'],
  options: ThreadsOptions = {},
): Extension => {
  const { reviewBranch, branchText, suggestionBranch, showComments = true } = options;
  const db = doc && Obj.getDatabase(doc);
  // The no-op keeps the comment facets present (so the editor never errors on their absence) while
  // rendering nothing — used both when comments are unavailable and when the policy hides them.
  if (!doc || !db || !invokePromise || !showComments) {
    return [comments({ id: 'noop' })];
  }

  // Anchors are cursors within whichever document the editor is bound to: the branch content in
  // Branch view, else main.
  const contentText = branchText ?? doc.content.target ?? undefined;

  const { registry, stateAtom } = store;
  const objectId = Obj.getURI(doc);
  const query = db.query(Query.select(Filter.id(doc.id)).targetOf(AnchoredTo.AnchoredTo));

  // Get current anchors by combining query results with store drafts, scoped to the review branch so
  // inline marks show only the comments for the branch currently in view (undefined tag = main).
  const getAnchors = () =>
    query.results
      .filter((anchor) => {
        // `Relation.getSource` throws while ECHO is still resolving the source proxy (e.g. a
        // just-persisted comment relation, or during restore); skip such anchors until they resolve
        // rather than crash the query listener.
        // TODO(burdon): Mitigation — the query surfaces relations whose source isn't yet resolved.
        //   Fix at the source: have the query defer/await source resolution (or expose a resolved
        //   flag) so callers don't guard each `getSource`; then remove this try/catch.
        try {
          const thread = Relation.getSource(anchor);
          return Obj.instanceOf(Thread.Thread, thread) && thread.status !== 'resolved';
        } catch {
          return false;
        }
      })
      .concat(registry.get(stateAtom).drafts[objectId] ?? [])
      .filter((anchor) => (anchor.branch ?? 'main') === (reviewBranch ?? 'main'));

  return [
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        getAnchors().forEach((anchor) => {
          if (anchor.anchor) {
            // Only update if the name has changed, otherwise this will cause an infinite loop.
            // Skip if the name is empty; this means comment text was deleted, but thread name should remain.
            const name = getName(contentText, anchor.anchor);
            const thread = Relation.getSource(anchor) as Thread.Thread;
            if (name && name !== thread.name) {
              Obj.update(thread, (thread) => {
                thread.name = name;
              });
            }
          }
        });
      }
    }),

    comments({
      id: objectId,
      // Tag new comments with the review branch so they scope to the branch under review; main stays untagged.
      reviewBranch,
      // Suggestion branches prohibit inline comments; existing comments still render.
      readonly: suggestionBranch,
      // `getAnchors()` is already branch-scoped, so selection-style highlights show only the review
      // branch's comments.
      getComments: () =>
        getAnchors()
          .filter((anchor) => anchor.anchor)
          .map((anchor) => ({
            id: Obj.getURI(Relation.getSource(anchor)),
            cursor: anchor.anchor,
          })),
      subscribe: (sink) => {
        // Subscribe to both query changes and store state changes.
        const unsubQuery = query.subscribe(sink);
        const unsubStore = registry.subscribe(stateAtom, sink);
        return () => {
          unsubQuery();
          unsubStore();
        };
      },
      onCreate: ({ cursor, branch }) => {
        const name = getName(contentText, cursor);
        void invokePromise(CommentOperation.Create, {
          anchor: cursor,
          name,
          subject: doc,
          branch,
        });
      },
      onDelete: ({ id }) => {
        const drafts = registry.get(stateAtom).drafts[objectId];
        if (drafts) {
          const index = drafts.findIndex((draft) => Relation.getURI(draft) === id);
          if (index !== -1) {
            const current = registry.get(stateAtom);
            registry.set(stateAtom, {
              ...current,
              drafts: {
                ...current.drafts,
                [objectId]: current.drafts[objectId]?.filter((_, draftIndex) => draftIndex !== index),
              },
            });
          }
        }

        const thread = query.results.find((object) => Relation.getSource(object).id === id);
        if (thread) {
          Relation.update(thread, (thread) => {
            thread.anchor = undefined;
          });
        }
      },
      onUpdate: ({ id, cursor }) => {
        const draft = registry.get(stateAtom).drafts[objectId]?.find((d) => Relation.getURI(d) === id);
        if (draft) {
          const thread = Relation.getSource(draft) as Thread.Thread;
          Obj.update(thread, (thread) => {
            thread.name = getName(contentText, cursor);
          });
          Relation.update(draft, (draft) => {
            draft.anchor = cursor;
          });
        }

        const relation = query.results.find((object) => Relation.getSource(object).id === id);
        if (relation) {
          const thread = Relation.getSource(relation);
          if (Obj.instanceOf(Thread.Thread, thread)) {
            Obj.update(thread, (thread) => {
              thread.name = getName(contentText, cursor);
            });
            Relation.update(relation, (relation) => {
              relation.anchor = cursor;
            });
          }
        }
      },
      onSelect: ({ selection }) => {
        const current = selection.current ?? selection.closest;
        if (current) {
          void invokePromise(CommentOperation.Select, { current });
        }
      },
    }),
  ];
};
