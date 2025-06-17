//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';

import { Capabilities, contributes, createIntent, type PluginContext } from '@dxos/app-framework';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { commentClickedEffect, commentsState, type EditorState, overlap } from '@dxos/react-ui-editor';

import { ThreadCapabilities } from './capabilities';
import { threads } from '../extensions';

export default (context: PluginContext) =>
  contributes(MarkdownCapabilities.Extensions, [
    ({ document: doc }) => {
      const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
      const { state } = context.getCapability(ThreadCapabilities.MutableState);
      return threads(state, doc, dispatch);
    },
    ({ document: doc }) => {
      const { state } = context.getCapability(ThreadCapabilities.MutableState);

      return EditorView.updateListener.of((update) => {
        if (update.docChanged || update.selectionSet) {
          state.toolbar[fullyQualifiedId(doc)] = selectionOverlapsComment(update.state);
        }
      });
    },
    ({ document: doc }) => {
      const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
      const id = fullyQualifiedId(doc);

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
  ]);

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
