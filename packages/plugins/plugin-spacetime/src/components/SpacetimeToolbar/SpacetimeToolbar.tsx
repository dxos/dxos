//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { ElevationProvider } from '@dxos/react-ui';
import { type ActionGraphProps, Menu, MenuBuilder, MenuRootProps, useMenuActions } from '@dxos/react-ui-menu';
import { composable, composableProps } from '@dxos/ui-theme';

import { type Model } from '../../types';
import { type EditorActions, createEditorActions, createPrimitiveSelector } from './actions';
import { type SpacetimeTool, createToolActions } from './tools';
import { type ViewState, createSelectionModeActions, createViewActions } from './view';

export type SpacetimeToolbarState = {
  tool: SpacetimeTool;
};

export type SpacetimeToolbarProps = Pick<MenuRootProps, 'alwaysActive'> & {
  tool: SpacetimeTool;
  onToolChange: (tool: SpacetimeTool) => void;
  viewState: ViewState;
  onViewChange: (next: Partial<ViewState>) => void;
  selectedPrimitive: Model.PrimitiveType;
  onPrimitiveChange: (primitive: Model.PrimitiveType) => void;
  editorActions: EditorActions;
};

export const SpacetimeToolbar = composable<HTMLDivElement, SpacetimeToolbarProps>(
  (
    {
      alwaysActive,
      tool,
      onToolChange,
      viewState,
      onViewChange,
      selectedPrimitive,
      onPrimitiveChange,
      editorActions,
      ...props
    },
    forwardedRef,
  ) => {
    const menuCreator = useMemo(
      () =>
        createToolbarActions({
          tool,
          onToolChange,
          viewState,
          onViewChange,
          selectedPrimitive,
          onPrimitiveChange,
          editorActions,
        }),
      [tool, onToolChange, viewState, onViewChange, selectedPrimitive, onPrimitiveChange, editorActions],
    );
    const menuActions = useMenuActions(menuCreator);

    return (
      <ElevationProvider elevation='base'>
        <Menu.Root alwaysActive={alwaysActive} {...menuActions}>
          <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
        </Menu.Root>
      </ElevationProvider>
    );
  },
);

const createToolbarActions = ({
  tool,
  onToolChange,
  viewState,
  onViewChange,
  selectedPrimitive,
  onPrimitiveChange,
  editorActions,
}: SpacetimeToolbarProps): Atom.Atom<ActionGraphProps> => {
  return Atom.make(() =>
    MenuBuilder.make()
      .subgraph(createSelectionModeActions(viewState, onViewChange))
      .separator('line')
      .subgraph(createPrimitiveSelector(selectedPrimitive, onPrimitiveChange))
      .subgraph(createEditorActions(editorActions))
      .separator('line')
      .subgraph(createToolActions({ tool }, onToolChange))
      .separator()
      .subgraph(createViewActions(viewState, onViewChange))
      .build(),
  );
};
