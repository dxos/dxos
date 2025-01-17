//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';

import { type Graph } from '@dxos/app-graph';
import { type ToolbarActionGroup } from '@dxos/react-ui-menu';

import { createEditorAction, type EditorToolbarState } from './util';

const commentLabel = (comment?: boolean, selection?: boolean) =>
  comment
    ? 'selection overlaps existing comment label'
    : selection === false
      ? 'select text to comment label'
      : 'comment label';

const createCommentAction = (label: string) => createEditorAction({ type: 'comment' }, 'ph--chat-text--regular', label);

export const mountComment = (graph: Graph, state: EditorToolbarState): [ToolbarActionGroup, () => void] => {
  const unsubscribe = effect(() => {
    const commentAction = createCommentAction(commentLabel(state.comment, state.selection));
    // @ts-ignore
    graph._addNodes([commentAction]);
  });

  return [graph.findNode('comment') as ToolbarActionGroup, unsubscribe];
};
