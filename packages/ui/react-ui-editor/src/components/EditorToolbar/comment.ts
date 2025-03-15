//
// Copyright 2025 DXOS.org
//

import { type Label } from '@dxos/react-ui';

import { createEditorAction, type EditorToolbarState } from './util';
import { translationKey } from '../../translations';

const commentLabel = (comment?: boolean, selection?: boolean) =>
  comment
    ? 'selection overlaps existing comment label'
    : selection === false
      ? 'select text to comment label'
      : 'comment label';

const createCommentAction = (label: Label) =>
  createEditorAction({ type: 'comment', testId: 'editor.toolbar.comment' }, 'ph--chat-text--regular', label);

export const createComment = (state: EditorToolbarState) => ({
  nodes: [createCommentAction([commentLabel(state.comment, state.selection), { ns: translationKey }])],
  edges: [{ source: 'root', target: 'comment' }],
});
