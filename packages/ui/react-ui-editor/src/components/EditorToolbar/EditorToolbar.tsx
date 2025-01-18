//
// Copyright 2024 DXOS.org
//

import { useSignalEffect } from '@preact/signals-react';
import React, { useCallback, useState } from 'react';

import { Graph, type NodeArg, type Node } from '@dxos/app-graph';
import { Toolbar, type ToolbarItem, type ToolbarProps, type ToolbarActionGroup } from '@dxos/react-ui-menu';

import { createBlocks } from './blocks';
import { createComment } from './comment';
import { createFormatting } from './formatting';
import { createHeadings } from './headings';
import { createLists } from './lists';
import {
  edgesArrayToRecord,
  type EditorToolbarFeatureFlags,
  editorToolbarGap,
  type EditorToolbarProps,
  editorToolbarSearch,
  type EditorToolbarState,
} from './util';
import { createViewMode } from './viewMode';

const createToolbar = ({
  state,
  ...features
}: EditorToolbarFeatureFlags & { state: EditorToolbarState }): {
  nodes: NodeArg<any>[];
  edges: { source: string; target: string }[];
} => {
  const nodes = [];
  const edges = [];
  if (features.headings ?? true) {
    const headings = createHeadings(state);
    nodes.push(...headings.nodes);
    edges.push(...headings.edges);
  }
  if (features.formatting ?? true) {
    const formatting = createFormatting(state);
    nodes.push(...formatting.nodes);
    edges.push(...formatting.edges);
  }
  if (features.lists ?? true) {
    const lists = createLists(state);
    nodes.push(...lists.nodes);
    edges.push(...lists.edges);
  }
  if (features.blocks ?? true) {
    const blocks = createBlocks(state);
    nodes.push(...blocks.nodes);
    edges.push(...blocks.edges);
  }
  nodes.push(editorToolbarGap);
  edges.push({ source: 'root', target: editorToolbarGap.id });
  if (features.comment ?? true) {
    const comment = createComment(state);
    nodes.push(...comment.nodes);
    edges.push(...comment.edges);
  }
  if (features.search ?? true) {
    nodes.push(editorToolbarSearch);
    edges.push({ source: 'root', target: editorToolbarSearch.id });
  }
  if (features.viewMode ?? true) {
    const viewMode = createViewMode(state);
    nodes.push(...viewMode.nodes);
    edges.push(...viewMode.edges);
  }
  return { nodes, edges };
};

//
// Root
//
const useEditorToolbarActionGraph = ({ onAction, ...props }: EditorToolbarProps) => {
  const initialToolbar = createToolbar(props);

  const [graph] = useState(
    new Graph({ nodes: initialToolbar.nodes as Node[], edges: edgesArrayToRecord(initialToolbar.edges) }),
  );

  useSignalEffect(() => {
    const toolbar = createToolbar(props);
    // @ts-ignore
    graph._addNodes(toolbar.nodes);
    // @ts-ignore
    graph._addEdges(toolbar.edges);
  });

  const resolveGroupItems = useCallback(
    (sourceNode: ToolbarActionGroup = graph.root as ToolbarActionGroup) => {
      if (graph) {
        return (graph.nodes(sourceNode, { filter: (n): n is any => true }) || null) as ToolbarItem[] | null;
      } else {
        return null;
      }
    },
    [graph],
  );

  return { resolveGroupItems, onAction: onAction as ToolbarProps['onAction'] };
};

export const EditorToolbar = ({ classNames, ...props }: EditorToolbarProps) => {
  const toolbarProps = useEditorToolbarActionGraph(props);
  return <Toolbar {...toolbarProps} classNames={classNames} />;
};
