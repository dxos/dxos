//
// Copyright 2025 DXOS.org
//

import { type NodeArg } from '@dxos/app-graph';
import { type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';
import { translationKey } from '@dxos/ui-editor';

import { type EditorViewMode } from '../../types';

import { createEditorAction, createEditorActionGroup } from './actions';
import { type EditorToolbarState } from './useEditorToolbar';

const createViewModeGroupAction = (value: string) =>
  createEditorActionGroup(
    'viewMode',
    {
      variant: 'dropdownMenu',
      applyActive: true,
      selectCardinality: 'single',
      value,
    } as ToolbarMenuActionGroupProperties,
    'ph--eye--regular',
  );

const createViewModeActions = (value: string, onViewModeChange: (mode: EditorViewMode) => void) =>
  Object.entries({
    preview: 'ph--eye--regular',
    source: 'ph--pencil-simple--regular',
    readonly: 'ph--pencil-slash--regular',
  }).map(([viewMode, icon]) => {
    const checked = viewMode === value;
    return createEditorAction(
      `view-mode--${viewMode}`,
      {
        label: [`${viewMode} mode label`, { ns: translationKey }],
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
    nodes: [viewModeGroupAction as NodeArg<any>, ...viewModeActions],
    edges: [
      { source: 'root', target: 'viewMode' },
      ...viewModeActions.map(({ id }) => ({ source: viewModeGroupAction.id, target: id })),
    ],
  };
};
