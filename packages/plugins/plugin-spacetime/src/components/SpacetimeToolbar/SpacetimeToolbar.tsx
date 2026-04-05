//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { ElevationProvider } from '@dxos/react-ui';
import { type ActionGraphProps, Menu, MenuBuilder, MenuRootProps, useMenuActions } from '@dxos/react-ui-menu';
import { HuePicker } from '@dxos/react-ui-pickers';
import { composable, composableProps } from '@dxos/ui-theme';

import { type Model } from '../../types';
import { type EditorActions, createEditorActions, createPrimitiveSelector } from './actions';
import { type SelectionState, createSelectionModeActions } from './selection';
import { type ToolState, createToolActions } from './tools';
import { type ViewState, createViewActions } from './view';

export type SpacetimeToolbarProps = Pick<MenuRootProps, 'alwaysActive'> & {
  editorActions: EditorActions;

  toolState: ToolState;
  onToolChange: (next: Partial<ToolState>) => void;

  viewState: ViewState;
  onViewChange: (next: Partial<ViewState>) => void;

  // TODO(burdon): Generalize to propertiesState.
  selectedHue: string;
  onHueChange: (hue: string) => void;

  selectionState: SelectionState;
  onSelectionChange: (next: Partial<SelectionState>) => void;

  selectedPrimitive: Model.PrimitiveType;
  onSelectedPrimitiveChange: (primitive: Model.PrimitiveType) => void;
};

export const SpacetimeToolbar = composable<HTMLDivElement, SpacetimeToolbarProps>(
  (
    {
      alwaysActive,
      editorActions,
      toolState,
      onToolChange,
      viewState,
      onViewChange,
      selectedHue,
      onHueChange,
      selectionState,
      onSelectionChange,
      selectedPrimitive,
      onSelectedPrimitiveChange,
      ...props
    },
    forwardedRef,
  ) => {
    const menuCreator = useMemo(
      () =>
        createToolbarActions({
          editorActions,
          toolState,
          onToolChange,
          viewState,
          onViewChange,
          selectedHue,
          onHueChange,
          selectionState,
          onSelectionChange,
          selectedPrimitive,
          onSelectedPrimitiveChange,
        }),
      [
        editorActions,
        toolState,
        onToolChange,
        viewState,
        onViewChange,
        selectedHue,
        onHueChange,
        selectionState,
        onSelectionChange,
        selectedPrimitive,
        onSelectedPrimitiveChange,
      ],
    );
    const menuActions = useMenuActions(menuCreator);

    return (
      <ElevationProvider elevation='base'>
        <Menu.Root alwaysActive={alwaysActive} {...menuActions}>
          <Menu.Toolbar {...composableProps(props)} ref={forwardedRef}>
            {/* TODO(burdon): Extend builder to support custom components. */}
            <HuePicker value={selectedHue} onChange={onHueChange} />
          </Menu.Toolbar>
        </Menu.Root>
      </ElevationProvider>
    );
  },
);

const createToolbarActions = ({
  editorActions,
  toolState,
  onToolChange,
  viewState,
  onViewChange,
  selectionState,
  onSelectionChange,
  selectedPrimitive,
  onSelectedPrimitiveChange,
}: SpacetimeToolbarProps): Atom.Atom<ActionGraphProps> => {
  return Atom.make(() =>
    MenuBuilder.make()
      .subgraph(createSelectionModeActions(selectionState, onSelectionChange))
      .separator('line')
      .subgraph(createToolActions(toolState, onToolChange))
      .separator('line')
      .subgraph(createPrimitiveSelector(selectedPrimitive, onSelectedPrimitiveChange))
      .separator('line')
      .subgraph(createEditorActions(editorActions))
      .separator()
      .subgraph(createViewActions(viewState, onViewChange))
      .build(),
  );
};
