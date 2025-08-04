//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { memo, useMemo } from 'react';

import { type NodeArg, rxFromSignal } from '@dxos/app-graph';
import { ElevationProvider } from '@dxos/react-ui';
import { MenuProvider, ToolbarMenu, createGapSeparator, useMenuActions } from '@dxos/react-ui-menu';

import { createBlocks } from './blocks';
import { createFormatting } from './formatting';
import { createHeadings } from './headings';
import { createImageUpload } from './image';
import { createLists } from './lists';
import { createSearch } from './search';
import { type EditorToolbarActionGraphProps, type EditorToolbarFeatureFlags, type EditorToolbarProps } from './util';
import { createViewMode } from './view-mode';

const createToolbar = ({
  getView,
  state,
  customActions,
  ...features
}: EditorToolbarFeatureFlags & Pick<EditorToolbarActionGraphProps, 'getView' | 'state' | 'customActions'>): Rx.Rx<{
  nodes: NodeArg<any>[];
  edges: { source: string; target: string }[];
}> => {
  return Rx.make((get) => {
    const nodes = [];
    const edges = [];
    if (features.headings ?? true) {
      const headings = get(rxFromSignal(() => createHeadings(state, getView)));
      nodes.push(...headings.nodes);
      edges.push(...headings.edges);
    }
    if (features.formatting ?? true) {
      const formatting = get(rxFromSignal(() => createFormatting(state, getView)));
      nodes.push(...formatting.nodes);
      edges.push(...formatting.edges);
    }
    if (features.lists ?? true) {
      const lists = get(rxFromSignal(() => createLists(state, getView)));
      nodes.push(...lists.nodes);
      edges.push(...lists.edges);
    }
    if (features.blocks ?? true) {
      const blocks = get(rxFromSignal(() => createBlocks(state, getView)));
      nodes.push(...blocks.nodes);
      edges.push(...blocks.edges);
    }
    if (features.image) {
      const image = get(rxFromSignal(() => createImageUpload(features.image!)));
      nodes.push(...image.nodes);
      edges.push(...image.edges);
    }
    const editorToolbarGap = createGapSeparator();
    nodes.push(...editorToolbarGap.nodes);
    edges.push(...editorToolbarGap.edges);
    if (customActions) {
      const custom = get(customActions);
      nodes.push(...custom.nodes);
      edges.push(...custom.edges);
    }
    if (features.search ?? true) {
      const search = get(rxFromSignal(() => createSearch(getView)));
      nodes.push(...search.nodes);
      edges.push(...search.edges);
    }
    if (features.viewMode) {
      const viewMode = get(rxFromSignal(() => createViewMode(state, features.viewMode!)));
      nodes.push(...viewMode.nodes);
      edges.push(...viewMode.edges);
    }
    return { nodes, edges };
  });
};

// TODO(wittjosiah): Toolbar re-rendering is causing this graph to be recreated and breaking reactivity in some cases.
//   E.g. for toolbar dropdowns which use active icon, the icon is not updated when the active item changes.
//   This is currently only happening in the markdown plugin usage and should be reproduced in an editor story.
const useEditorToolbarActionGraph = (props: EditorToolbarProps) => {
  const menuCreator = useMemo(
    () =>
      createToolbar({
        getView: props.getView,
        state: props.state,
        customActions: props.customActions,
        headings: props.headings,
        formatting: props.formatting,
        lists: props.lists,
        blocks: props.blocks,
        image: props.image,
        search: props.search,
        viewMode: props.viewMode,
      }),
    [
      props.getView,
      props.state,
      props.customActions,
      props.headings,
      props.formatting,
      props.lists,
      props.blocks,
      props.image,
      props.search,
      props.viewMode,
    ],
  );

  return useMenuActions(menuCreator);
};

export const EditorToolbar = memo(({ classNames, attendableId, role, ...props }: EditorToolbarProps) => {
  const menuProps = useEditorToolbarActionGraph(props);
  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <MenuProvider {...menuProps} attendableId={attendableId}>
        <ToolbarMenu classNames={classNames} textBlockWidth />
      </MenuProvider>
    </ElevationProvider>
  );
});
