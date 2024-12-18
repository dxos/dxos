//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { computed, effect } from '@preact/signals-core';

import { type IntentDispatcher } from '@dxos/app-framework';
import { Ref } from '@dxos/echo-schema';
import { RefArray } from '@dxos/live-object';
import { type DocumentType } from '@dxos/plugin-markdown/types';
import { ThreadType } from '@dxos/plugin-space/types';
import { getSpace, getTextInRange, createDocAccessor, fullyQualifiedId } from '@dxos/react-client/echo';
import { comments, createExternalCommentSync } from '@dxos/react-ui-editor';

import { ThreadAction, type ThreadState } from '../types';

// TODO(burdon): Factor out.
const getName = (doc: DocumentType, anchor: string): string | undefined => {
  if (doc.content) {
    const [start, end] = anchor.split(':');
    return getTextInRange(createDocAccessor(doc.content.target!, ['content']), start, end);
  }
};

/**
 * Construct plugins.
 */
export const threads = (state: ThreadState, doc?: DocumentType, dispatch?: IntentDispatcher): Extension => {
  const space = doc && getSpace(doc);
  if (!doc || !space || !dispatch) {
    // Include no-op comments extension here to ensure that the facets are always present when they are expected.
    // TODO(wittjosiah): The Editor should only look for these facets when comments are available.
    return [comments()];
  }

  // TODO(Zan): When we have the deepsignal specific equivalent of this we should use that instead.
  const threads = computed(() =>
    [...RefArray.allResolvedTargets(doc.threads), ...(state.drafts[fullyQualifiedId(doc)] ?? [])].filter(
      (thread) => !(thread?.status === 'resolved'),
    ),
  );

  return [
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        RefArray.allResolvedTargets(doc.threads).forEach((thread) => {
          if (thread.anchor) {
            // Only update if the name has changed, otherwise this will cause an infinite loop.
            // Skip if the name is empty; this means comment text was deleted, but thread name should remain.
            const name = getName(doc, thread.anchor);
            if (name && name !== thread.name) {
              thread.name = name;
            }
          }
        });
      }
    }),

    createExternalCommentSync(
      fullyQualifiedId(doc),
      (sink) => effect(() => sink()),
      () =>
        threads.value
          .filter((thread) => thread?.anchor)
          .map((thread) => ({ id: fullyQualifiedId(thread), cursor: thread.anchor! })),
    ),

    comments({
      id: fullyQualifiedId(doc),
      onCreate: ({ cursor }) => {
        const name = getName(doc, cursor);
        void dispatch({
          action: ThreadAction.CREATE,
          data: {
            cursor,
            name,
            subject: doc,
          },
        });
      },
      onDelete: ({ id }) => {
        const draft = state.drafts[fullyQualifiedId(doc)];
        if (draft) {
          const index = draft.findIndex((thread) => fullyQualifiedId(thread) === id);
          if (index !== -1) {
            draft.splice(index, 1);
          }
        }

        const thread = doc.threads.find(Ref.hasObjectId(id))?.target;
        if (thread) {
          thread.anchor = undefined;
        }
      },
      onUpdate: ({ id, cursor }) => {
        const thread =
          state.drafts[fullyQualifiedId(doc)]?.find((thread) => fullyQualifiedId(thread) === id) ??
          doc.threads.find(Ref.hasObjectId(id))?.target;

        if (thread instanceof ThreadType && thread.anchor) {
          thread.name = getName(doc, thread.anchor);
          thread.anchor = cursor;
        }
      },
      onSelect: ({ selection: { current, closest } }) => {
        void dispatch({
          action: ThreadAction.SELECT,
          data: {
            current: current ?? closest,
            skipOpen: true,
          },
        });
      },
    }),
  ];
};
