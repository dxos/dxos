//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { createDocAccessor, getTextInRange } from '@dxos/echo-db';
import { type OperationInvoker } from '@dxos/operation';
import { type Markdown } from '@dxos/plugin-markdown/types';
import { AnchoredTo, Thread } from '@dxos/types';
import { comments, createExternalCommentSync } from '@dxos/ui-editor';

import { type ThreadCapabilities, ThreadOperation } from '../types';

// TODO(burdon): Factor out.
const getName = (doc: Markdown.Document, anchor: string): string | undefined => {
  if (doc.content) {
    const [start, end] = anchor.split(':');
    return getTextInRange(createDocAccessor(doc.content.target!, ['content']), start, end);
  }
};

/**
 * Construct plugins.
 */
export const threads = (
  store: ThreadCapabilities.ThreadStateStore,
  doc?: Markdown.Document,
  invokePromise?: OperationInvoker.OperationInvoker['invokePromise'],
): Extension => {
  const db = doc && Obj.getDatabase(doc);
  if (!doc || !db || !invokePromise) {
    // Include no-op comments extension here to ensure that the facets are always present when they are expected.
    // TODO(wittjosiah): The Editor should only look for these facets when comments are available.
    return [comments()];
  }

  const objectId = Obj.getDXN(doc).toString();
  const query = db.query(Query.select(Filter.id(doc.id)).targetOf(AnchoredTo.AnchoredTo));

  // Get current anchors by combining query results with store drafts.
  const getAnchors = () =>
    query.results
      .filter((anchor) => {
        const thread = Relation.getSource(anchor);
        return Obj.instanceOf(Thread.Thread, thread) && thread.status !== 'resolved';
      })
      .concat(store.state.drafts[objectId] ?? []);

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
              Obj.change(thread, (t) => {
                t.name = name;
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
        const unsubStore = store.subscribeState(sink);
        return () => {
          unsubQuery();
          unsubStore();
        };
      },
      () =>
        getAnchors()
          .filter((anchor) => anchor.anchor)
          .map((anchor) => ({
            id: Obj.getDXN(Relation.getSource(anchor)).toString(),
            cursor: anchor.anchor,
          })),
    ),

    comments({
      id: objectId,
      onCreate: ({ cursor }) => {
        const name = getName(doc, cursor);
        void invokePromise(ThreadOperation.Create, {
          anchor: cursor,
          name,
          subject: doc,
        });
      },
      onDelete: ({ id }) => {
        const drafts = store.state.drafts[objectId];
        if (drafts) {
          const index = drafts.findIndex((thread) => Obj.getDXN(thread).toString() === id);
          if (index !== -1) {
            store.updateState((current) => ({
              ...current,
              drafts: {
                ...current.drafts,
                [objectId]: current.drafts[objectId]?.filter((_, i) => i !== index),
              },
            }));
          }
        }

        const thread = query.results.find((object) => Relation.getSource(object).id === id);
        if (thread) {
          Obj.change(thread, (t) => {
            t.anchor = undefined;
          });
        }
      },
      onUpdate: ({ id, cursor }) => {
        const draft = store.state.drafts[objectId]?.find((thread) => Obj.getDXN(thread).toString() === id);
        if (draft) {
          const thread = Relation.getSource(draft) as Thread.Thread;
          Obj.change(thread, (t) => {
            t.name = getName(doc, cursor);
          });
          Obj.change(draft, (d) => {
            d.anchor = cursor;
          });
        }

        const relation = query.results.find((object) => Relation.getSource(object).id === id);
        if (relation) {
          const thread = Relation.getSource(relation);
          if (Obj.instanceOf(Thread.Thread, thread)) {
            Obj.change(thread, (t) => {
              t.name = getName(doc, cursor);
            });
            Obj.change(relation, (r) => {
              r.anchor = cursor;
            });
          }
        }
      },
      onSelect: ({ selection }) => {
        const current = selection.current ?? selection.closest;
        if (current) {
          void invokePromise(ThreadOperation.Select, { current });
        }
      },
    }),
  ];
};
