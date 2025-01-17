//
// Copyright 2025 DXOS.org
//

import { useSignalEffect } from '@preact/signals-react';

import { type Graph } from '@dxos/app-graph';

import { createEditorAction, type EditorToolbarState } from './util';

const commentLabel = (comment?: boolean, selection?: boolean) =>
  comment
    ? 'selection overlaps existing comment label'
    : selection === false
      ? 'select text to comment label'
      : 'comment label';

const createCommentAction = (label: string) => createEditorAction({ type: 'comment' }, 'ph--chat-text--regular', label);

export const useComment = (graph: Graph, state: EditorToolbarState) => {
  return useSignalEffect(() => {
    const commentAction = createCommentAction(commentLabel(state.comment, state.selection));
    // @ts-ignore
    graph._addNodes([commentAction]);
    // @ts-ignore
    graph._addEdges([{ source: 'root', target: 'comment' }]);
  });
};
