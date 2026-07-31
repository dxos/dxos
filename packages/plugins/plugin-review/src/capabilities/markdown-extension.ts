//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { type EditorState, commentsState, documentId, overlap } from '@dxos/ui-editor';

import { meta } from '#meta';
import { CommentCapabilities } from '#types';

import { commentSync } from '../extensions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    // Surface "Suggesting" as an editor view-mode option (the review feature is owned by plugin-review,
    // so it appears only when this plugin is present); selecting it puts the document in suggesting mode.
    const suggestingViewMode = Capability.contribute(MarkdownCapabilities.ViewModeExtension, {
      id: 'suggesting',
      icon: 'ph--note-pencil--regular',
      label: ['view-mode.suggesting.label', { ns: meta.profile.key }],
      reviewMode: 'suggesting',
      order: 3,
    });

    const extensions = Capability.contribute(MarkdownCapabilities.ExtensionProvider, [
      ({ document: doc, reviewBranch, branchText, suggestionBranch, showComments }) => {
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        const registry = capabilities.get(Capabilities.AtomRegistry);
        const stateAtom = capabilities.get(CommentCapabilities.State);

        return commentSync({ registry, stateAtom }, doc, invokePromise, {
          reviewBranch,
          branchText,
          suggestionBranch,
          showComments,
        });
      },
      // TODO(burdon): Factor out?
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
    ]);

    return [extensions, suggestingViewMode];
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
