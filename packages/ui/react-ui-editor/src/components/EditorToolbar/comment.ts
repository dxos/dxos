//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Label } from '@dxos/react-ui';

import { createEditorAction, type EditorToolbarState } from './util';
import { createComment as nativeCreateComment } from '../../extensions';
import { translationKey } from '../../translations';

const commentLabel = (comment?: boolean, selection?: boolean) =>
  comment
    ? 'selection overlaps existing comment label'
    : selection === false
      ? 'select text to comment label'
      : 'comment label';

const createCommentAction = (label: Label, getView: () => EditorView) =>
  createEditorAction('comment', () => nativeCreateComment(getView()), {
    testId: 'editor.toolbar.comment',
    icon: 'ph--chat-text--regular',
    label,
  });

export const createComment = (state: EditorToolbarState, getView: () => EditorView) => ({
  nodes: [createCommentAction([commentLabel(state.comment, state.selection), { ns: translationKey }], getView)],
  edges: [{ source: 'root', target: 'comment' }],
});
