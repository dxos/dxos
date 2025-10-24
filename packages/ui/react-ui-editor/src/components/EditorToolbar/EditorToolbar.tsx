//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { memo, useMemo } from 'react';

import { rxFromSignal } from '@dxos/app-graph';
import { ElevationProvider } from '@dxos/react-ui';
import {
  type ActionGraphProps,
  MenuProvider,
  ToolbarMenu,
  createGapSeparator,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { createBlocks } from './blocks';
import { createFormatting } from './formatting';
import { createHeadings } from './headings';
import { createImageUpload } from './image';
import { createLists } from './lists';
import { createSearch } from './search';
import { type EditorToolbarActionGraphProps, type EditorToolbarFeatureFlags, type EditorToolbarProps } from './util';
import { createViewMode } from './view-mode';

const createToolbarActions = ({
  getView,
  state,
  customActions,
  ...features
}: EditorToolbarFeatureFlags &
  Pick<EditorToolbarActionGraphProps, 'getView' | 'state' | 'customActions'>): Rx.Rx<ActionGraphProps> => {
  return Rx.make((get) => {
    const graph: ActionGraphProps = {
      nodes: [],
      edges: [],
    };

    if (features.headings ?? true) {
      const headings = get(rxFromSignal(() => createHeadings(state, getView)));
      graph.nodes.push(...headings.nodes);
      graph.edges.push(...headings.edges);
    }
    if (features.formatting ?? true) {
      const formatting = get(rxFromSignal(() => createFormatting(state, getView)));
      graph.nodes.push(...formatting.nodes);
      graph.edges.push(...formatting.edges);
    }
    if (features.lists ?? true) {
      const lists = get(rxFromSignal(() => createLists(state, getView)));
      graph.nodes.push(...lists.nodes);
      graph.edges.push(...lists.edges);
    }
    if (features.blocks ?? true) {
      const blocks = get(rxFromSignal(() => createBlocks(state, getView)));
      graph.nodes.push(...blocks.nodes);
      graph.edges.push(...blocks.edges);
    }
    if (features.image) {
      const image = get(rxFromSignal(() => createImageUpload(features.image!)));
      graph.nodes.push(...image.nodes);
      graph.edges.push(...image.edges);
    }
    {
      const gap = createGapSeparator();
      graph.nodes.push(...gap.nodes);
      graph.edges.push(...gap.edges);
    }
    if (customActions) {
      const custom = get(customActions);
      graph.nodes.push(...custom.nodes);
      graph.edges.push(...custom.edges);
    }
    if (features.search ?? true) {
      const search = get(rxFromSignal(() => createSearch(getView)));
      graph.nodes.push(...search.nodes);
      graph.edges.push(...search.edges);
    }
    if (features.viewMode) {
      const viewMode = get(rxFromSignal(() => createViewMode(state, features.viewMode!)));
      graph.nodes.push(...viewMode.nodes);
      graph.edges.push(...viewMode.edges);
    }

    return graph;
  });
};

// TODO(wittjosiah): Toolbar re-rendering is causing this graph to be recreated and breaking reactivity in some cases.
//   E.g. for toolbar dropdowns which use active icon, the icon is not updated when the active item changes.
//   This is currently only happening in the markdown plugin usage and should be reproduced in an editor story.
const useEditorToolbarActionGraph = (props: EditorToolbarProps) => {
  const menuCreator = useMemo(
    () =>
      createToolbarActions({
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

export const EditorToolbar = memo(({ attendableId, role, ...props }: EditorToolbarProps) => {
  const menuProps = useEditorToolbarActionGraph(props);

  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <MenuProvider {...menuProps} attendableId={attendableId}>
        <ToolbarMenu textBlockWidth />
      </MenuProvider>
    </ElevationProvider>
  );
});
