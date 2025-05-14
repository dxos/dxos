//
// Copyright 2024 DXOS.org
//

import React, { memo, useCallback } from 'react';

import { type NodeArg } from '@dxos/app-graph';
import { ElevationProvider } from '@dxos/react-ui';
import { MenuProvider, ToolbarMenu, createGapSeparator, useMenuActions } from '@dxos/react-ui-menu';
import { textBlockWidth } from '@dxos/react-ui-theme';

import { createBlocks } from './blocks';
import { createComment } from './comment';
import { createFormatting } from './formatting';
import { createHeadings } from './headings';
import { createImageUpload } from './image';
import { createLists } from './lists';
import { createSearch } from './search';
import { type EditorToolbarActionGraphProps, type EditorToolbarFeatureFlags, type EditorToolbarProps } from './util';
import { createViewMode } from './view-mode';
import { stackItemContentToolbarClassNames } from '../../defaults';

const createToolbar = ({
  getView,
  state,
  customActions,
  ...features
}: EditorToolbarFeatureFlags & Pick<EditorToolbarActionGraphProps, 'getView' | 'state' | 'customActions'>): {
  nodes: NodeArg<any>[];
  edges: { source: string; target: string }[];
} => {
  const nodes = [];
  const edges = [];
  if (features.headings ?? true) {
    const headings = createHeadings(state, getView);
    nodes.push(...headings.nodes);
    edges.push(...headings.edges);
  }
  if (features.formatting ?? true) {
    const formatting = createFormatting(state, getView);
    nodes.push(...formatting.nodes);
    edges.push(...formatting.edges);
  }
  if (features.lists ?? true) {
    const lists = createLists(state, getView);
    nodes.push(...lists.nodes);
    edges.push(...lists.edges);
  }
  if (features.blocks ?? true) {
    const blocks = createBlocks(state, getView);
    nodes.push(...blocks.nodes);
    edges.push(...blocks.edges);
  }
  if (features.image) {
    const image = createImageUpload(features.image);
    nodes.push(...image.nodes);
    edges.push(...image.edges);
  }
  if (customActions) {
    const custom = customActions();
    nodes.push(...custom.nodes);
    edges.push(...custom.edges);
  }
  const editorToolbarGap = createGapSeparator();
  nodes.push(...editorToolbarGap.nodes);
  edges.push(...editorToolbarGap.edges);
  if (features.comment) {
    const comment = createComment(state, getView);
    nodes.push(...comment.nodes);
    edges.push(...comment.edges);
  }
  if (features.search ?? true) {
    const search = createSearch(getView);
    nodes.push(...search.nodes);
    edges.push(...search.edges);
  }
  if (features.viewMode) {
    const viewMode = createViewMode(state, features.viewMode);
    nodes.push(...viewMode.nodes);
    edges.push(...viewMode.edges);
  }
  return { nodes, edges };
};

// TODO(wittjosiah): Toolbar re-rendering is causing this graph to be recreated and breaking reactivity in some cases.
//   E.g. for toolbar dropdowns which use active icon, the icon is not updated when the active item changes.
//   This is currently only happening in the markdown plugin usage and should be reproduced in an editor story.
const useEditorToolbarActionGraph = (props: EditorToolbarProps) => {
  const menuCreator = useCallback(() => createToolbar(props), [props]);
  return useMenuActions(menuCreator);
};

export const EditorToolbar = memo(({ classNames, attendableId, role, ...props }: EditorToolbarProps) => {
  const menuProps = useEditorToolbarActionGraph(props);
  return (
    <div role='none' className={stackItemContentToolbarClassNames(role)}>
      <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
        <MenuProvider {...menuProps} attendableId={attendableId}>
          <ToolbarMenu classNames={[textBlockWidth, '!bg-transparent', classNames]} />
        </MenuProvider>
      </ElevationProvider>
    </div>
  );
});
