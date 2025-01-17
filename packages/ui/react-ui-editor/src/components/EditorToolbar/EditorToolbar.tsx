//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Graph } from '@dxos/app-graph';
import { Toolbar, type ToolbarActionGroup, type ToolbarItem, type ToolbarProps } from '@dxos/react-ui-menu';

import { mountBlocks } from './blocks';
import { mountComment } from './comment';
import { mountFormatting } from './formatting';
import { mountHeadingActions } from './headings';
import { mountLists } from './lists';
import {
  type EditorToolbarActionGraphProps,
  editorToolbarGap,
  type EditorToolbarProps,
  editorToolbarSearch,
} from './util';
import { mountViewMode } from './viewMode';

//
// Root
//
// TODO(thure): Derive actions from the reactive state
const useEditorToolbarActionGraph = ({ state }: EditorToolbarActionGraphProps) => {
  const [graph] = useState(new Graph());
  const [formatting] = mountFormatting(graph, state);
  const [list] = mountLists(graph, state);
  const [block] = mountBlocks(graph, state);
  const [comment] = mountComment(graph, state);
  const [viewMode] = mountViewMode(graph, state);
  const [headings] = mountHeadingActions(graph, state);
  const actions = useMemo(
    () => [headings, formatting, list, block, editorToolbarGap, editorToolbarSearch, comment, viewMode],
    [headings],
  );

  const resolveGroupItems = useCallback(
    async (groupNode: ToolbarActionGroup) => {
      if (graph) {
        return await graph.waitForNode(groupNode.id).then(
          (groupNode) => (graph.actions(groupNode) || null) as ToolbarItem[] | null,
          () => null,
        );
      } else {
        return null;
      }
    },
    [graph],
  );

  return { resolveGroupItems, actions };
};

export const EditorToolbar = ({ classNames, ...actionProps }: EditorToolbarProps) => {
  const toolbarProps = useEditorToolbarActionGraph(actionProps);
  return (
    <Toolbar {...toolbarProps} onAction={actionProps.onAction as ToolbarProps['onAction']} classNames={classNames} />
  );
};
