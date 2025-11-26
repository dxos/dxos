//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { computed, effect } from '@preact/signals-core';

import { type PromiseIntentDispatcher, createIntent } from '@dxos/app-framework';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { createDocAccessor, getTextInRange } from '@dxos/echo-db';
import { type Markdown } from '@dxos/plugin-markdown/types';
import { getSpace } from '@dxos/react-client/echo';
import { comments, createExternalCommentSync } from '@dxos/react-ui-editor';
import { AnchoredTo, Thread } from '@dxos/types';

import { ThreadAction, type ThreadState } from '../types';

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
export const threads = (state: ThreadState, doc?: Markdown.Document, dispatch?: PromiseIntentDispatcher): Extension => {
  const space = getSpace(doc);
  if (!doc || !space || !dispatch) {
    // Include no-op comments extension here to ensure that the facets are always present when they are expected.
    // TODO(wittjosiah): The Editor should only look for these facets when comments are available.
    return [comments()];
  }

  const query = space.db.query(Query.select(Filter.ids(doc.id)).targetOf(AnchoredTo.AnchoredTo));
  const unsubscribe = query.subscribe();

  const anchors = computed(() =>
    query.objects
      .filter((anchor) => {
        const thread = Relation.getSource(anchor);
        return Obj.instanceOf(Thread.Thread, thread) && thread.status !== 'resolved';
      })
      .concat(state.drafts[Obj.getDXN(doc).toString()] ?? []),
  );

  return [
    EditorView.domEventHandlers({
      destroy: () => {
        unsubscribe();
      },
    }),

    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        anchors.value.forEach((anchor) => {
          if (anchor.anchor) {
            // Only update if the name has changed, otherwise this will cause an infinite loop.
            // Skip if the name is empty; this means comment text was deleted, but thread name should remain.
            const name = getName(doc, anchor.anchor);
            const thread = Relation.getSource(anchor) as Thread.Thread;
            if (name && name !== thread.name) {
              thread.name = name;
            }
          }
        });
      }
    }),

    createExternalCommentSync(
      Obj.getDXN(doc).toString(),
      (sink) => effect(() => sink()),
      () =>
        anchors.value
          .filter((anchor) => anchor.anchor)
          .map((anchor) => ({
            id: Obj.getDXN(Relation.getSource(anchor)).toString(),
            cursor: anchor.anchor,
          })),
    ),

    comments({
      id: Obj.getDXN(doc).toString(),
      onCreate: ({ cursor }) => {
        const name = getName(doc, cursor);
        void dispatch(
          createIntent(ThreadAction.Create, {
            anchor: cursor,
            name,
            subject: doc,
          }),
        );
      },
      onDelete: ({ id }) => {
        const draft = state.drafts[Obj.getDXN(doc).toString()];
        if (draft) {
          const index = draft.findIndex((thread) => Obj.getDXN(thread).toString() === id);
          if (index !== -1) {
            draft.splice(index, 1);
          }
        }

        const thread = query.objects.find((object) => Relation.getSource(object).id === id);
        if (thread) {
          thread.anchor = undefined;
        }
      },
      onUpdate: ({ id, cursor }) => {
        const draft = state.drafts[Obj.getDXN(doc).toString()]?.find((thread) => Obj.getDXN(thread).toString() === id);
        if (draft) {
          const thread = Relation.getSource(draft) as Thread.Thread;
          thread.name = getName(doc, cursor);
          draft.anchor = cursor;
        }

        const relation = query.objects.find((object) => Relation.getSource(object).id === id);
        if (relation) {
          const thread = Relation.getSource(relation);
          if (Obj.instanceOf(Thread.Thread, thread)) {
            thread.name = getName(doc, cursor);
            relation.anchor = cursor;
          }
        }
      },
      onSelect: ({ selection }) => {
        const current = selection.current ?? selection.closest;
        if (current) {
          void dispatch(createIntent(ThreadAction.Select, { current }));
        }
      },
    }),
  ];
};
