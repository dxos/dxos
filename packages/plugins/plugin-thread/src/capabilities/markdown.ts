//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';

import { Capabilities, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { type EditorState, commentClickedEffect, commentsState, overlap } from '@dxos/react-ui-editor';

import { threads } from '../extensions';

import { ThreadCapabilities } from './capabilities';

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
