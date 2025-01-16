//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Graph } from '@dxos/app-graph';
import { Toolbar, type ToolbarActionGroup, type ToolbarItem } from '@dxos/react-ui-menu';

import { useBlocks } from './useBlocks';
import { useComment } from './useComment';
import { useFormatting } from './useFormatting';
import { useHeadings } from './useHeadings';
import { useLists } from './useLists';
import { useViewModes } from './useViewMode';
import { type EditorToolbarActionGraphProps, editorToolbarGap, type EditorToolbarProps } from './util';

//
// Root
//
// TODO(thure): Make `state` a live object derived from EditorView et al, since it is created in this package.
const useEditorToolbarActionGraph = ({ state, mode }: EditorToolbarActionGraphProps) => {
  const [graph] = useState(new Graph());
  const headings = useHeadings(graph, state);
  const formatting = useFormatting(graph, state);
  const list = useLists(graph, state);
  const block = useBlocks(graph, state);
  const comment = useComment(graph, state);
  const viewMode = useViewModes(graph, mode);

  const actions = useMemo(() => [headings, formatting, list, block, editorToolbarGap, comment, viewMode], []);

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
  return <Toolbar {...toolbarProps} classNames={classNames} />;
};
