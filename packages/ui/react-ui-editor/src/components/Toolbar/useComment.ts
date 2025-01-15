//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type Graph } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import { type MenuAction } from '@dxos/react-ui-menu';
import { type DeepWriteable } from '@dxos/util';

import { createEditorAction, type EditorToolbarState } from './util';

const commentLabel = (comment?: boolean, selection?: boolean) =>
  comment
    ? 'selection overlaps existing comment label'
    : selection === false
      ? 'select text to comment label'
      : 'comment label';

const commentAction = createEditorAction({ type: 'comment' }, 'ph--chat-text--regular', 'comment label');

export const useComment = (graph: Graph, state: EditorToolbarState) => {
  useEffect(() => {
    // @ts-ignore
    graph._addNodes([commentAction]);
  }, [graph]);

  useEffect(() => {
    invariant(graph);
    const commentAction = graph.findNode('comment');
    (commentAction as DeepWriteable<MenuAction>).properties.label = commentLabel(state.comment, state.selection);
  }, [state.comment, state.selection]);

  return commentAction;
};
