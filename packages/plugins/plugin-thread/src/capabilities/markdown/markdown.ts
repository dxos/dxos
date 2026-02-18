//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { type EditorState, commentClickedEffect, commentsState, overlap } from '@dxos/ui-editor';

import { threads } from '../../extensions';
import { ThreadCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    return Capability.contributes(MarkdownCapabilities.Extensions, [
      ({ document: doc }) => {
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        const registry = capabilities.get(Capabilities.AtomRegistry);
        const stateAtom = capabilities.get(ThreadCapabilities.State);
        return threads({ registry, stateAtom }, doc, invokePromise);
      },
      ({ document: doc }) => {
        if (!doc) return [];
        const registry = capabilities.get(Capabilities.AtomRegistry);
        const stateAtom = capabilities.get(ThreadCapabilities.State);

        return EditorView.updateListener.of((update) => {
          if (update.docChanged || update.selectionSet) {
            const objectId = Obj.getDXN(doc).toString();
            const overlaps = selectionOverlapsComment(update.state);
            const current = registry.get(stateAtom);
            registry.set(stateAtom, {
              ...current,
              toolbar: { ...current.toolbar, [objectId]: overlaps },
            });
          }
        });
      },
      ({ document: doc }) => {
        if (!doc) return [];
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        const id = Obj.getDXN(doc).toString();

        return EditorView.updateListener.of((update) => {
          update.transactions.forEach((transaction) => {
            transaction.effects.forEach(async (effect) => {
              if (effect.is(commentClickedEffect)) {
                void invokePromise(DeckOperation.ChangeCompanion, {
                  primary: id,
                  companion: `${id}${ATTENDABLE_PATH_SEPARATOR}comments`,
                });
              }
            });
          });
        });
      },
    ]);
  }),
);

const selectionOverlapsComment = (state: EditorState): boolean => {
  // May not be defined if thread plugin not installed.
  const commentState = state.field(commentsState, false);
  if (commentState === undefined) {
    return false;
  }

  const { selection } = state;
  for (const range of selection.ranges) {
    if (commentState.comments.some(({ range: commentRange }) => overlap(commentRange, range))) {
      return true;
    }
  }

  return false;
};
