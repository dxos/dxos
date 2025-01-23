//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useCallback } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { createGapSeparator, MenuProvider, ToolbarMenu, useMenuActions } from '@dxos/react-ui-menu';

import { createAlign, useAlignState } from './align';
import { createComment, useCommentState } from './comment';
import { createStyle, useStyleState } from './style';
import { useToolbarAction } from './useToolbarAction';
import { type ToolbarState, useToolbarState } from './useToolbarState';

//
// Root
//

export type SheetToolbarProps = ThemedClassName<PropsWithChildren<{ attendableId?: string }>>;

const createToolbarActions = (state: ToolbarState) => {
  const align = createAlign(state);
  const style = createStyle(state);
  const gap = createGapSeparator();
  const comment = createComment(state);
  return {
    nodes: [...align.nodes, ...style.nodes, ...gap.nodes, ...comment.nodes],
    edges: [...align.edges, ...style.edges, ...gap.edges, ...comment.edges],
  };
};

export const SheetToolbar = ({ attendableId, classNames }: SheetToolbarProps) => {
  const state = useToolbarState({});
  useAlignState(state);
  useStyleState(state);
  useCommentState(state);

  const actionsCreator = useCallback(() => createToolbarActions(state), [state]);
  const menu = useMenuActions(actionsCreator);
  const handleAction = useToolbarAction(state);

  return (
    <MenuProvider {...menu} attendableId={attendableId} onAction={handleAction}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};
