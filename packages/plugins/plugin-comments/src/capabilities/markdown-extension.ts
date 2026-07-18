//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { linkedSegment } from '@dxos/react-ui-attention';
import { type EditorState, commentClickedEffect, commentsState, documentId, overlap } from '@dxos/ui-editor';

import { CommentCapabilities, CommentOperation } from '#types';

import { threads } from '../extensions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = yield* CommentCapabilities.State;

    return [
      Capability.provide(MarkdownCapabilities.ExtensionProvider, [
        ({ document: doc }) => {
          return threads({ registry, stateAtom }, doc, invokePromise);
        },
        ({ document: doc }) => {
          if (!doc) {
            return [];
          }

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
      ]),
    ];
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
