//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { Atom } from '@effect-atom/atom-react';
import React, { memo, useMemo } from 'react';

import { type Node } from '@dxos/app-graph';
import { ElevationProvider, type ThemedClassName } from '@dxos/react-ui';
import {
  type ActionGraphProps,
  type MenuAction,
  MenuProvider,
  ToolbarMenu,
  createGapSeparator,
  useMenuActions,
} from '@dxos/react-ui-menu';
import { type EditorViewMode } from '@dxos/ui-editor';

import { createLists } from './actions';
import { createBlocks } from './blocks';
import { createFormatting } from './formatting';
import { createHeadings } from './headings';
import { createImageUpload } from './image';
import { createSearch } from './search';
import { type EditorToolbarState } from './useEditorToolbar';
import { createViewMode } from './view-mode';

export type EditorToolbarFeatureFlags = Partial<{
  showHeadings: boolean;
  showFormatting: boolean;
  showLists: boolean;
  showBlocks: boolean;
  showSearch: boolean;

  // TODO(wittjosiah): Factor out (depends on plugin-level capabilities.)
  onImageUpload: () => void;
  onViewModeChange: (mode: EditorViewMode) => void;
}>;

export type EditorToolbarActionGraphProps = {
  state: Atom.Atom<EditorToolbarState>;
  getView: () => EditorView;
  // TODO(wittjosiah): Control positioning.
  customActions?: Atom.Atom<ActionGraphProps>;
};

export type EditorToolbarProps = ThemedClassName<
  {
    role?: string;
    attendableId?: string;
    /** Handler for executing actions. Required when customActions use Operation.invoke. */
    onAction?: (action: MenuAction, params: Node.InvokeProps) => void;
  } & (EditorToolbarActionGraphProps & EditorToolbarFeatureFlags)
>;

// TODO(burdon): Remove role dependency.
export const EditorToolbar = memo(({ classNames, role, attendableId, onAction, ...props }: EditorToolbarProps) => {
  const menuProps = useEditorToolbarActionGraph(props);

  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <MenuProvider {...menuProps} attendableId={attendableId} onAction={onAction}>
        <ToolbarMenu classNames={classNames} textBlockWidth />
      </MenuProvider>
    </ElevationProvider>
  );
});

type ToolbarActionsProps = Pick<EditorToolbarActionGraphProps, 'state' | 'getView' | 'customActions'> &
  EditorToolbarFeatureFlags;

// TODO(wittjosiah): Toolbar re-rendering is causing this graph to be recreated and breaking reactivity in some cases.
//   E.g. for toolbar dropdowns which use active icon, the icon is not updated when the active item changes.
//   This is currently only happening in the markdown plugin usage and should be reproduced in an editor story.
const useEditorToolbarActionGraph = ({ state, getView, customActions, ...features }: ToolbarActionsProps) => {
  const menuCreator = useMemo(
    () => createToolbarActions({ state, getView, customActions, ...features }),
    [
      state,
      getView,
      customActions,
      features?.showHeadings,
      features?.showFormatting,
      features?.showLists,
      features?.showBlocks,
      features?.showSearch,
      features?.onImageUpload,
      features?.onViewModeChange,
    ],
  );

  return useMenuActions(menuCreator);
};

const createToolbarActions = ({
  state,
  getView,
  customActions,
  ...features
}: ToolbarActionsProps): Atom.Atom<ActionGraphProps> => {
  return Atom.make((get) => {
    const graph: ActionGraphProps = {
      nodes: [],
      edges: [],
    };

    // TODO(burdon): Builder pattern?
    const addSubGraph = (graph: ActionGraphProps, subGraph: ActionGraphProps) => {
      graph.nodes.push(...subGraph.nodes);
      graph.edges.push(...subGraph.edges);
    };

    // Subscribe to state changes.
    const stateSnapshot = get(state);

    if (features?.showHeadings ?? true) {
      addSubGraph(graph, createHeadings(stateSnapshot, getView));
    }
    if (features?.showFormatting ?? true) {
      addSubGraph(graph, createFormatting(stateSnapshot, getView));
    }
    if (features?.showLists ?? true) {
      addSubGraph(graph, createLists(stateSnapshot, getView));
    }
    if (features?.showBlocks ?? true) {
      addSubGraph(graph, createBlocks(stateSnapshot, getView));
    }
    if (features?.onImageUpload) {
      addSubGraph(graph, createImageUpload(features.onImageUpload!));
    }

    addSubGraph(graph, createGapSeparator());

    if (customActions) {
      addSubGraph(graph, get(customActions));
    }
    if (features?.showSearch ?? true) {
      addSubGraph(graph, createSearch(getView));
    }
    if (features?.onViewModeChange) {
      addSubGraph(graph, createViewMode(stateSnapshot, features.onViewModeChange!));
    }

    return graph;
  });
};
