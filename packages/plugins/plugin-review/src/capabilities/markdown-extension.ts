//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Doc } from '@dxos/echo-doc';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { type EditorState, commentsState, documentId, overlap } from '@dxos/ui-editor';

import { CommentCapabilities } from '#types';

import { commentSync } from '../extensions/index.ts';
import { ReviewNamespace } from '../namespace.ts';
import { findCommentConfig } from '../util/commentable.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    // Surface "Suggesting" as an editor view-mode option (the review feature is owned by plugin-review,
    // so it appears only when this plugin is present); selecting it puts the document in suggesting mode.
    const suggestingViewMode = Capability.contribute(MarkdownCapabilities.ViewModeExtension, {
      id: 'suggesting',
      icon: 'ph--note-pencil--regular',
      label: ['view-mode.suggesting.label', { ns: ReviewNamespace.key }],
      reviewMode: 'suggesting',
      order: 3,
    });

    const extensions = Capability.contribute(MarkdownCapabilities.ExtensionProvider, [
      ({ document: doc, subject, binding, reviewBranch, branchText, suggestionBranch, showComments }) => {
        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        const registry = capabilities.get(Capabilities.AtomRegistry);
        const stateAtom = capabilities.get(CommentCapabilities.State);

        // Anchors are cursors within the text the editor is bound to: the branch content in Branch view, else main,
        // else the bound string. Only a string of the subject's own (a feature's name) carries its path in the anchor.
        const text = branchText ?? doc?.content.peek();
        const target = doc
          ? { subject: doc, accessor: text && Doc.createAccessor(text, ['content']) }
          : binding &&
              subject &&
              findCommentConfig(capabilities.getAll(AppCapabilities.CommentConfig), subject)?.comments === 'anchored'
            ? {
                subject,
                accessor: Doc.createAccessor(binding.object, [...binding.path]),
                path: binding.object === subject ? binding.path : undefined,
              }
            : undefined;
        return commentSync({ registry, stateAtom }, target, invokePromise, {
          reviewBranch,
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
