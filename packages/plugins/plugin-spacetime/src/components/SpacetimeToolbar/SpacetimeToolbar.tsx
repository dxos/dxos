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
import { type EditorActions, createEditorActions, createTemplateSelector } from './actions';
import { type PropertiesState } from './properties';
import { type SelectionState, createSelectionModeActions } from './selection';
import { type ToolState, createToolActions } from './tools';
import { type ViewState, createViewActions } from './view';

export type SpacetimeToolbarProps = Pick<MenuRootProps, 'attendableId' | 'alwaysActive'> & {
  editorActions: EditorActions;

  // TODO(burdon): State should be separate.
  toolState: ToolState;
  viewState: ViewState;
  propertiesState: PropertiesState;
  selectionState: SelectionState;
  selectedTemplate: Model.ObjectTemplate;

  onToolChange: (next: Partial<ToolState>) => void;
  onViewChange: (next: Partial<ViewState>) => void;
  onPropertiesChange: (next: Partial<PropertiesState>) => void;
  onSelectionChange: (next: Partial<SelectionState>) => void;
  onSelectedTemplateChange: (template: Model.ObjectTemplate) => void;
};

export const SpacetimeToolbar = composable<HTMLDivElement, SpacetimeToolbarProps>(
  (
    {
      attendableId,
      alwaysActive,
      editorActions,
      toolState,
      onToolChange,
      viewState,
      onViewChange,
      propertiesState,
      onPropertiesChange,
      selectionState,
      onSelectionChange,
      selectedTemplate,
      onSelectedTemplateChange,
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
          selectionState,
          onSelectionChange,
          viewState,
          onViewChange,
          propertiesState,
          onPropertiesChange,
          selectedTemplate,
          onSelectedTemplateChange,
        }),
      [
        editorActions,
        toolState,
        onToolChange,
        selectionState,
        onSelectionChange,
        viewState,
        onViewChange,
        selectedTemplate,
        onSelectedTemplateChange,
      ],
    );
    const menuActions = useMenuActions(menuCreator);

    return (
      <ElevationProvider elevation='base'>
        <Menu.Root attendableId={attendableId} alwaysActive={alwaysActive} {...menuActions}>
          <Menu.Toolbar {...composableProps(props)} ref={forwardedRef}>
            {/* TODO(burdon): Extend builder to support custom components. */}
            <HuePicker value={propertiesState.hue} onChange={(hue) => onPropertiesChange({ hue })} />
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
  selectionState,
  onSelectionChange,
  viewState,
  onViewChange,
  selectedTemplate,
  onSelectedTemplateChange,
}: SpacetimeToolbarProps): Atom.Atom<ActionGraphProps> => {
  return Atom.make(() =>
    MenuBuilder.make()
      .subgraph(createSelectionModeActions(selectionState, onSelectionChange))
      .separator('line')
      .subgraph(createToolActions(toolState, onToolChange))
      .separator('line')
      .subgraph(createTemplateSelector(selectedTemplate, onSelectedTemplateChange))
      .separator('line')
      .subgraph(createEditorActions(editorActions, selectionState.selectionCount))
      .separator()
      .subgraph(createViewActions(viewState, onViewChange))
      .build(),
  );
};
