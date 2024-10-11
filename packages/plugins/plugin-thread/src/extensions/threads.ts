//
// Copyright 2024 DXOS.org
//

import { computed, effect } from '@preact/signals-core';

import { type IntentDispatcher } from '@dxos/app-framework';
import { type DocumentType } from '@dxos/plugin-markdown/types';
import { ThreadType } from '@dxos/plugin-space/types';
import { getSpace, getTextInRange, createDocAccessor, fullyQualifiedId } from '@dxos/react-client/echo';
import { comments, createExternalCommentSync, listener } from '@dxos/react-ui-editor';
import { nonNullable } from '@dxos/util';

import { ThreadAction, type ThreadState } from '../types';

/**
 * Construct plugins.
 */
export const threads = (state: ThreadState, doc?: DocumentType, dispatch?: IntentDispatcher) => {
  const space = doc && getSpace(doc);
  if (!doc || !space || !dispatch) {
    // Include no-op comments extension here to ensure that the facets are always present when they are expected.
    // TODO(wittjosiah): The Editor should only look for these facets when comments are available.
    return [comments()];
  }

  // TODO(Zan): When we have the deepsignal specific equivalent of this we should use that instead.
  const threads = computed(() =>
    [...doc.threads.filter(nonNullable), ...(state.staging[fullyQualifiedId(doc)] ?? [])].filter(
      (thread) => !(thread?.status === 'resolved'),
    ),
  );

  return [
    listener({
      onChange: () => {
        doc.threads.forEach((thread) => {
          if (thread?.anchor) {
            const [start, end] = thread.anchor.split(':');
            const name = doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
            // TODO(burdon): This seems unsafe; review.
            // Only update if the name has changed, otherwise this will cause an infinite loop.
            // Skip if the name is empty - this means comment text was deleted, but thread name should remain.
            if (name && name !== thread.name) {
              thread.name = name;
            }
          }
        });
      },
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
        const [start, end] = cursor.split(':');
        const name = doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
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
        // If the thread is in the staging area, remove it.
        const stagingArea = state.staging[fullyQualifiedId(doc)];
        if (stagingArea) {
          const index = stagingArea.findIndex((thread) => fullyQualifiedId(thread) === id);
          if (index !== -1) {
            stagingArea.splice(index, 1);
          }
        }

        const thread = doc.threads.find((thread) => thread?.id === id);
        if (thread) {
          thread.anchor = undefined;
        }
      },
      onUpdate: ({ id, cursor }) => {
        const thread =
          state.staging[fullyQualifiedId(doc)]?.find((thread) => fullyQualifiedId(thread) === id) ??
          doc.threads.find((thread) => thread?.id === id);

        if (thread instanceof ThreadType && thread.anchor) {
          const [start, end] = thread.anchor.split(':');
          thread.name = doc.content && getTextInRange(createDocAccessor(doc.content, ['content']), start, end);
          thread.anchor = cursor;
        }
      },
      onSelect: ({ selection: { current, closest } }) => {
        void dispatch([{ action: ThreadAction.SELECT, data: { current: current ?? closest } }]);
      },
    }),
  ];
};
