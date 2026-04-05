//
// Copyright 2025 DXOS.org
//

import { type Node } from '@dxos/app-graph';
import { type EditorViewMode } from '@dxos/ui-editor';

import { translationKey } from '../../translations';

import { createEditorMenuAction, createEditorMenuItemGroup } from './actions';
import { type EditorToolbarState } from './useEditorToolbar';

const createViewModeGroupAction = (value: string) =>
  createEditorMenuItemGroup('viewMode', {
    icon: 'ph--eye--regular',
    variant: 'dropdownMenu',
    applyActive: true,
    selectCardinality: 'single',
    value,
  });

const createViewModeActions = (value: string, onViewModeChange: (mode: EditorViewMode) => void) =>
  Object.entries({
    preview: 'ph--eye--regular',
    source: 'ph--pencil-simple--regular',
    readonly: 'ph--pencil-slash--regular',
  }).map(([viewMode, icon]) => {
    const checked = viewMode === value;
    return createEditorMenuAction(
      `view-mode--${viewMode}`,
      {
        label: [`view-mode.${viewMode}.label`, { ns: translationKey }],
        checked,
        icon,
      },
      () => onViewModeChange(viewMode as EditorViewMode),
    );
  });

export const createViewMode = (state: EditorToolbarState, onViewModeChange: (mode: EditorViewMode) => void) => {
  const value = state.viewMode ?? 'source';
  const viewModeGroupAction = createViewModeGroupAction(value);
  const viewModeActions = createViewModeActions(value, onViewModeChange);
  return {
    nodes: [viewModeGroupAction as Node.NodeArg<any>, ...viewModeActions],
    edges: [
      { source: 'root', target: 'viewMode', relation: 'child' },
      ...viewModeActions.map(({ id }) => ({ source: viewModeGroupAction.id, target: id, relation: 'child' })),
    ],
  };
};
