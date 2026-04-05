//
// Copyright 2026 DXOS.org
//

import { type ActionGraphProps, createMenuAction, createMenuItemGroup } from '@dxos/react-ui-menu';

import { meta } from '../../meta';

export type SelectionMode = 'object' | 'face';

export type ViewState = {
  selectionMode: SelectionMode;
  showGrid: boolean;
  showDebug: boolean;
};

/** Creates the selection mode toggle group action subgraph. */
export const createSelectionModeActions = (
  state: ViewState,
  onViewChange: (next: Partial<ViewState>) => void,
): ActionGraphProps => {
  const groupAction = createMenuItemGroup('selection-mode', {
    iconOnly: true,
    label: ['selection-mode.label', { ns: meta.id }],
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value: state.selectionMode,
  });

  const modes: Record<SelectionMode, string> = {
    object: 'ph--cube--regular',
    face: 'ph--rectangle--regular',
  };

  const actions = Object.entries(modes).map(([mode, icon]) =>
    createMenuAction(mode, () => onViewChange({ selectionMode: mode as SelectionMode }), {
      label: [`selection-mode.${mode}.label`, { ns: meta.id }],
      checked: state.selectionMode === mode,
      icon,
    }),
  );

  return {
    nodes: [groupAction, ...actions],
    edges: [
      { source: 'root', target: 'selection-mode', relation: 'child' },
      ...actions.map(({ id }) => ({ source: groupAction.id, target: id, relation: 'child' })),
    ],
  };
};

/** Creates the view options toggle group action subgraph. */
export const createViewActions = (
  state: ViewState,
  onViewChange: (next: Partial<ViewState>) => void,
): ActionGraphProps => {
  const viewGroupAction = createMenuItemGroup('view', {
    iconOnly: true,
    label: ['view.label', { ns: meta.id }],
    variant: 'toggleGroup',
    selectCardinality: 'multiple',
    value: Object.entries(state)
      .filter(([key, value]) => key !== 'selectionMode' && value === true)
      .map(([key]) => key),
  });

  const gridAction = createMenuAction('showGrid', () => onViewChange({ showGrid: !state.showGrid }), {
    label: ['view.grid.label', { ns: meta.id }],
    checked: state.showGrid,
    icon: 'ph--grid-four--regular',
  });

  const debugAction = createMenuAction('showDebug', () => onViewChange({ showDebug: !state.showDebug }), {
    label: ['view.debug.label', { ns: meta.id }],
    checked: state.showDebug,
    icon: 'ph--bug--regular',
  });

  return {
    nodes: [viewGroupAction, gridAction, debugAction],
    edges: [
      { source: 'root', target: 'view', relation: 'child' },
      { source: viewGroupAction.id, target: gridAction.id, relation: 'child' },
      { source: viewGroupAction.id, target: debugAction.id, relation: 'child' },
    ],
  };
};
