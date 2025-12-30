//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capability, Common, createIntent } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { type EditorState, commentClickedEffect, commentsState, overlap } from '@dxos/ui-editor';

import { threads } from '../../extensions';
import { ThreadCapabilities } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(MarkdownCapabilities.Extensions, [
      ({ document: doc }) => {
        const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
        const { state } = context.getCapability(ThreadCapabilities.MutableState);
        return threads(state, doc, dispatch);
      },
      ({ document: doc }) => {
        if (!doc) return [];
        const { state } = context.getCapability(ThreadCapabilities.MutableState);

        return EditorView.updateListener.of((update) => {
          if (update.docChanged || update.selectionSet) {
            state.toolbar[Obj.getDXN(doc).toString()] = selectionOverlapsComment(update.state);
          }
        });
      },
      ({ document: doc }) => {
        if (!doc) return [];
        const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
        const id = Obj.getDXN(doc).toString();

        return EditorView.updateListener.of((update) => {
          update.transactions.forEach((transaction) => {
            transaction.effects.forEach(async (effect) => {
              if (effect.is(commentClickedEffect)) {
                void dispatch(
                  createIntent(DeckAction.ChangeCompanion, {
                    primary: id,
                    companion: `${id}${ATTENDABLE_PATH_SEPARATOR}comments`,
                  }),
                );
              }
            });
          });
        });
      },
    ]),
  ),
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
