//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { memo, useMemo } from 'react';

import { rxFromSignal } from '@dxos/app-graph';
import { ElevationProvider, type ThemedClassName } from '@dxos/react-ui';
import {
  type ActionGraphProps,
  MenuProvider,
  ToolbarMenu,
  createGapSeparator,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { type EditorViewMode } from '../../types';

import { createBlocks } from './blocks';
import { createFormatting } from './formatting';
import { createHeadings } from './headings';
import { createImageUpload } from './image';
import { createLists } from './lists';
import { createSearch } from './search';
import { type EditorToolbarActionGraphProps } from './util';
import { createViewMode } from './view-mode';

export type EditorToolbarFeatureFlags = Partial<{
  headings: boolean;
  formatting: boolean;
  lists: boolean;
  blocks: boolean;
  search: boolean;
  // TODO(wittjosiah): Factor out. Depend on plugin-level capabilities.
  onImageUpload: () => void;
  onViewModeChange: (mode: EditorViewMode) => void;
}>;

export type EditorToolbarProps = ThemedClassName<
  {
    role?: string;
    attendableId?: string;
  } & (EditorToolbarFeatureFlags & EditorToolbarActionGraphProps)
>;

// TODO(burdon): Remove role dependency.
export const EditorToolbar = memo(({ classNames, role, attendableId, ...props }: EditorToolbarProps) => {
  const menuProps = useEditorToolbarActionGraph(props);

  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <MenuProvider {...menuProps} attendableId={attendableId}>
        <ToolbarMenu classNames={classNames} textBlockWidth />
      </MenuProvider>
    </ElevationProvider>
  );
});

// TODO(wittjosiah): Toolbar re-rendering is causing this graph to be recreated and breaking reactivity in some cases.
//   E.g. for toolbar dropdowns which use active icon, the icon is not updated when the active item changes.
//   This is currently only happening in the markdown plugin usage and should be reproduced in an editor story.
const useEditorToolbarActionGraph = (props: EditorToolbarProps) => {
  const menuCreator = useMemo(
    () =>
      createToolbarActions({
        state: props.state,
        getView: props.getView,
        customActions: props.customActions,

        headings: props.headings,
        formatting: props.formatting,
        lists: props.lists,
        blocks: props.blocks,
        search: props.search,
        onImageUpload: props.onImageUpload,
        onViewModeChange: props.onViewModeChange,
      }),
    [
      props.state,
      props.getView,
      props.customActions,

      props.headings,
      props.formatting,
      props.lists,
      props.blocks,
      props.search,
      props.onImageUpload,
      props.onViewModeChange,
    ],
  );

  return useMenuActions(menuCreator);
};

const createToolbarActions = ({
  state,
  getView,
  customActions,
  ...features
}: EditorToolbarFeatureFlags &
  Pick<EditorToolbarActionGraphProps, 'getView' | 'state' | 'customActions'>): Rx.Rx<ActionGraphProps> => {
  return Rx.make((get) => {
    const graph: ActionGraphProps = {
      nodes: [],
      edges: [],
    };

    const addSubGraph = (graph: ActionGraphProps, subGraph: ActionGraphProps) => {
      graph.nodes.push(...subGraph.nodes);
      graph.edges.push(...subGraph.edges);
    };

    if (features.headings ?? true) {
      addSubGraph(graph, get(rxFromSignal(() => createHeadings(state, getView))));
    }
    if (features.formatting ?? true) {
      addSubGraph(graph, get(rxFromSignal(() => createFormatting(state, getView))));
    }
    if (features.lists ?? true) {
      addSubGraph(graph, get(rxFromSignal(() => createLists(state, getView))));
    }
    if (features.blocks ?? true) {
      addSubGraph(graph, get(rxFromSignal(() => createBlocks(state, getView))));
    }
    if (features.onImageUpload) {
      addSubGraph(graph, get(rxFromSignal(() => createImageUpload(features.onImageUpload!))));
    }

    addSubGraph(graph, createGapSeparator());

    if (customActions) {
      addSubGraph(graph, get(customActions));
    }
    if (features.search ?? true) {
      addSubGraph(graph, get(rxFromSignal(() => createSearch(getView))));
    }
    if (features.onViewModeChange) {
      addSubGraph(graph, get(rxFromSignal(() => createViewMode(state, features.onViewModeChange!))));
    }

    return graph;
  });
};
