//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type CompleteCellRange } from '@dxos/compute';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { type ThemedClassName } from '@dxos/react-ui';
import { createGapSeparator, MenuProvider, ToolbarMenu, useMenuActions } from '@dxos/react-ui-menu';

import { createAlign, useAlignState } from './align';
import { createComment, useCommentState } from './comment';
import { createStyle, useStyleState } from './style';
import { type ToolbarState, useToolbarState } from './useToolbarState';
import { type SheetModel } from '../../model';
import { useSheetContext } from '../SheetContext';

//
// Root
//

export type SheetToolbarProps = ThemedClassName<PropsWithChildren<{ attendableId?: string }>>;

const createToolbarActions = (
  model: SheetModel,
  state: ToolbarState,
  onComment: (cellContent: string, cursor: string) => void,
  cursorFallbackRange?: CompleteCellRange,
) => {
  const align = createAlign(model, state, cursorFallbackRange);
  const style = createStyle(model, state, cursorFallbackRange);
  const gap = createGapSeparator();
  const comment = createComment(model, state, onComment, cursorFallbackRange);
  return {
    nodes: [...align.nodes, ...style.nodes, ...gap.nodes, ...comment.nodes],
    edges: [...align.edges, ...style.edges, ...gap.edges, ...comment.edges],
  };
};

export const SheetToolbar = ({ attendableId, classNames }: SheetToolbarProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { model, cursorFallbackRange } = useSheetContext();
  const state = useToolbarState({});
  useAlignState(state);
  useStyleState(state);
  useCommentState(state);

  const handleComment = useCallback(
    (name: string, cursor: string) =>
      dispatch(
        createIntent(ThreadAction.Create, {
          cursor,
          name,
          subject: model.sheet,
        }),
      ),
    [model.sheet, dispatch],
  );

  const actionsCreator = useCallback(
    () => createToolbarActions(model, state, handleComment, cursorFallbackRange),
    [model, state, handleComment, cursorFallbackRange],
  );
  const menu = useMenuActions(actionsCreator);

  return (
    <MenuProvider {...menu} attendableId={attendableId}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};
