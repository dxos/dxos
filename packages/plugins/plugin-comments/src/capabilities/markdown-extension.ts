//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { linkedSegment } from '@dxos/react-ui-attention';
import { type EditorState, commentClickedEffect, commentsState, documentId, overlap } from '@dxos/ui-editor';

import { CommentCapabilities, CommentOperation } from '#types';

import { SuggestionSourcesProvider } from '../components';
import { threads } from '../extensions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    // Bridge the ambient suggestion overlay: markdown consumes this slot to enumerate every author's
    // active suggestion branches without importing plugin-comments (which depends on it).
    const suggestionSources = Capability.contributes(
      MarkdownCapabilities.SuggestionSourcesProvider,
      SuggestionSourcesProvider,
    );

    const extensions = Capability.contributes(MarkdownCapabilities.ExtensionProvider, [
      ({ document: doc, reviewBranch, branchText, suggestionBranch, showComments }) => {
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        const registry = capabilities.get(Capabilities.AtomRegistry);
        const stateAtom = capabilities.get(CommentCapabilities.State);
        return threads({ registry, stateAtom }, doc, invokePromise, {
          reviewBranch,
          branchText,
          suggestionBranch,
          showComments,
        });
      },
      ({ document: doc }) => {
        if (!doc) {
          return [];
        }
        const registry = capabilities.get(Capabilities.AtomRegistry);
        const stateAtom = capabilities.get(CommentCapabilities.State);

        return EditorView.updateListener.of((update) => {
          if (update.docChanged || update.selectionSet) {
            const id = update.state.facet(documentId);
            const overlaps = selectionOverlapsComment(update.state);
            const current = registry.get(stateAtom);
            registry.set(stateAtom, {
              ...current,
              toolbar: { ...current.toolbar, [id]: overlaps },
            });
          }
        });
      },
      ({ document: doc }) => {
        if (!doc) {
          return [];
        }
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);

        return EditorView.updateListener.of((update) => {
          update.transactions.forEach((transaction) => {
            transaction.effects.forEach((effect) => {
              if (effect.is(commentClickedEffect)) {
                // Select the clicked comment's thread (its id is the thread URI) so
                // the companion highlights and scrolls to it, then open the companion.
                void invokePromise(CommentOperation.Select, { current: effect.value });
                void invokePromise(LayoutOperation.UpdateCompanion, {
                  subject: linkedSegment('comments'),
                });
              }
            });
          });
        });
      },
    ]);

    return [extensions, suggestionSources];
  }),
);

const selectionOverlapsComment = (state: EditorState): boolean => {
  // May not be defined if comments plugin not installed.
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
