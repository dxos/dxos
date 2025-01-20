//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { type NodeArg } from '@dxos/app-graph';
import { ToolbarMenu, MenuProvider, type MenuActionHandler, useMenuActions } from '@dxos/react-ui-menu';

import { createBlocks } from './blocks';
import { createComment } from './comment';
import { createFormatting } from './formatting';
import { createHeadings } from './headings';
import { createLists } from './lists';
import {
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
  const menuCreator = useCallback(() => createToolbar(props), [props]);

  const { resolveGroupItems } = useMenuActions(menuCreator);

  return { resolveGroupItems, onAction: onAction as MenuActionHandler };
};

export const EditorToolbar = ({ classNames, ...props }: EditorToolbarProps) => {
  const menuProps = useEditorToolbarActionGraph(props);
  return (
    <MenuProvider {...menuProps}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};
