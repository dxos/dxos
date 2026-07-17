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
import { AnchoredTo, Thread } from '@dxos/types';
import { comments, createExternalCommentSync } from '@dxos/ui-editor';

import { CommentOperation } from '#types';
import { type CommentState } from '#types';

// TODO(burdon): Factor out.
const getName = (doc: Markdown.Document, anchor: string): string | undefined => {
  if (doc.content) {
    const [start, end] = anchor.split(':');
    return getTextInRange(Doc.createAccessor(doc.content.target!, ['content']), start, end);
  }
};

export type ThreadStore = {
  registry: Registry.Registry;
  stateAtom: Atom.Writable<CommentState>;
};

/**
 * Construct comment-sync editor extensions for a document.
 */
export const threads = (
  store: ThreadStore,
  doc?: Markdown.Document,
  invokePromise?: OperationInvoker.OperationInvoker['invokePromise'],
  // The active review branch (the core branch the editor is showing); undefined = main. Threaded from
  // the markdown editor (which resolves it from the per-object version selection) rather than read
  // from core `getCurrentBranch`, which stays 'main' under this branch's per-surface binding model.
  reviewBranch?: string,
): Extension => {
  const db = doc && Obj.getDatabase(doc);
  if (!doc || !db || !invokePromise) {
    // Include no-op comments extension here to ensure that the facets are always present when they are expected.
    // TODO(wittjosiah): The Editor should only look for these facets when comments are available.
    return [comments()];
  }

  const { registry, stateAtom } = store;
  const objectId = Obj.getURI(doc);
  const query = db.query(Query.select(Filter.id(doc.id)).targetOf(AnchoredTo.AnchoredTo));

  // Get current anchors by combining query results with store drafts, scoped to the review branch so
  // inline marks show only the comments for the branch currently in view (undefined tag = main).
  const getAnchors = () =>
    query.results
      .filter((anchor) => {
        const thread = Relation.getSource(anchor);
        return Obj.instanceOf(Thread.Thread, thread) && thread.status !== 'resolved';
      })
      .concat(registry.get(stateAtom).drafts[objectId] ?? [])
      .filter((anchor) => (anchor.branch ?? 'main') === (reviewBranch ?? 'main'));

  return [
    EditorView.domEventHandlers({
      destroy: () => {
        // Note: cleanup functions for subscriptions are handled by createExternalCommentSync.
      },
    }),

    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        getAnchors().forEach((anchor) => {
          if (anchor.anchor) {
            // Only update if the name has changed, otherwise this will cause an infinite loop.
            // Skip if the name is empty; this means comment text was deleted, but thread name should remain.
            const name = getName(doc, anchor.anchor);
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

    createExternalCommentSync(
      objectId,
      (sink) => {
        // Subscribe to both query changes and store state changes.
        const unsubQuery = query.subscribe(sink);
        const unsubStore = registry.subscribe(stateAtom, sink);
        return () => {
          unsubQuery();
          unsubStore();
        };
      },
      () =>
        getAnchors()
          .filter((anchor) => anchor.anchor)
          .map((anchor) => ({
            id: Obj.getURI(Relation.getSource(anchor)),
            cursor: anchor.anchor,
          })),
    ),

    comments({
      id: objectId,
      // Tag new comments with the review branch so they scope to the branch under review; main stays untagged.
      reviewBranch,
      onCreate: ({ cursor, branch }) => {
        const name = getName(doc, cursor);
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
            thread.name = getName(doc, cursor);
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
              thread.name = getName(doc, cursor);
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
