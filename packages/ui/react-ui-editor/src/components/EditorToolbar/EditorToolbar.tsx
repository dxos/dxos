//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Graph } from '@dxos/app-graph';
import { Toolbar, type ToolbarItem, type ToolbarProps, type ToolbarActionGroup } from '@dxos/react-ui-menu';

import { useBlocks } from './blocks';
import { useComment } from './comment';
import { useFormatting } from './formatting';
import { useHeadings } from './headings';
import { useLists } from './lists';
import {
  type EditorToolbarActionGraphProps,
  editorToolbarGap,
  type EditorToolbarProps,
  editorToolbarSearch,
  useStaticItem,
} from './util';
import { useViewModes } from './viewMode';

//
// Root
//
// TODO(thure): Derive actions from the reactive state
const useEditorToolbarActionGraph = ({ state }: EditorToolbarActionGraphProps) => {
  const [graph] = useState(new Graph());

  console.log('[created graph]');

  // The following occurs in the order in which it should render:
  useHeadings(graph, state);
  useFormatting(graph, state);
  useLists(graph, state);
  useBlocks(graph, state);
  useStaticItem(graph, editorToolbarGap);
  useStaticItem(graph, editorToolbarSearch);
  useComment(graph, state);
  useViewModes(graph, state);

  console.log('[populated graph]');

  const resolveGroupItems = useCallback(
    (sourceNode: ToolbarActionGroup = graph.root as ToolbarActionGroup) => {
      console.log('[resolve group items]', graph.actions(sourceNode));
      if (graph) {
        void graph.waitForNode('formatting').then(() => console.log('[wait for node]', graph.actions(graph.root)));
        return (graph.actions(sourceNode) || null) as ToolbarItem[] | null;
      } else {
        return null;
      }
    },
    [graph],
  );

  return { resolveGroupItems };
};

export const EditorToolbar = ({ classNames, ...actionProps }: EditorToolbarProps) => {
  const toolbarProps = useEditorToolbarActionGraph(actionProps);
  return (
    <Toolbar {...toolbarProps} onAction={actionProps.onAction as ToolbarProps['onAction']} classNames={classNames} />
  );
};
