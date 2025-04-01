//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { RefArray } from '@dxos/live-object';
import { createMenuAction } from '@dxos/react-ui-menu';

import { SHEET_PLUGIN } from '../../meta';
import { commentKey, type CommentKey, type CommentValue, rangeToIndex } from '../../types';
import { useSheetContext } from '../SheetContext';

export type CommentAction = { key: CommentKey; value: CommentValue; cellContent?: string };

export type CommentState = { commentEnabled: 'comment' | 'no cursor' | 'selection overlaps existing comment' };

export const useCommentState = (state: Partial<CommentState>) => {
  const { cursorFallbackRange, model } = useSheetContext();

  // TODO(thure): Can this O(n) call be memoized?
  const overlapsCommentAnchor = useMemo(
    () =>
      RefArray.targets(model.sheet.threads ?? [])
        .filter((thread) => thread.status !== 'resolved')
        .some((thread) => {
          if (!cursorFallbackRange) {
            return false;
          }
          return rangeToIndex(model.sheet, cursorFallbackRange) === thread.anchor;
        }),
    [cursorFallbackRange, model.sheet],
  );

  useEffect(() => {
    state.commentEnabled = !cursorFallbackRange
      ? 'no cursor'
      : overlapsCommentAnchor
        ? 'selection overlaps existing comment'
        : 'comment';
  }, [overlapsCommentAnchor, cursorFallbackRange]);
};

const createCommentAction = (state: Partial<CommentState>) =>
  createMenuAction<Pick<CommentAction, 'key'>>('comment', {
    key: commentKey,
    testId: 'editor.toolbar.comment',
    icon: 'ph--chat-text--regular',
    label: [`${state.commentEnabled} label`, { ns: SHEET_PLUGIN }],
    disabled: state.commentEnabled !== 'comment',
  });

export const createComment = (state: Partial<CommentState>) => ({
  nodes: [createCommentAction(state)],
  edges: [{ source: 'root', target: 'comment' }],
});
