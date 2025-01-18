//
// Copyright 2025 DXOS.org
//

import { createEditorAction, type EditorToolbarState } from './util';

const commentLabel = (comment?: boolean, selection?: boolean) =>
  comment
    ? 'selection overlaps existing comment label'
    : selection === false
      ? 'select text to comment label'
      : 'comment label';

const createCommentAction = (label: string) => createEditorAction({ type: 'comment' }, 'ph--chat-text--regular', label);

export const createComment = (state: EditorToolbarState) => ({
  nodes: [createCommentAction(commentLabel(state.comment, state.selection))],
  edges: [{ source: 'root', target: 'comment' }],
});
