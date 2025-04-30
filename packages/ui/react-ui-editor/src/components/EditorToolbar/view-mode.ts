//
// Copyright 2025 DXOS.org
//

import { type NodeArg } from '@dxos/app-graph';
import { type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { translationKey } from '../../translations';

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

const createViewModeActions = (value: string) =>
  Object.entries({
    preview: 'ph--eye--regular',
    source: 'ph--pencil-simple--regular',
    readonly: 'ph--pencil-slash--regular',
  }).map(([viewMode, icon]) => {
    return createEditorAction(
      { type: 'view-mode', data: viewMode, checked: viewMode === value },
      icon,
      [`${viewMode} mode label`, { ns: translationKey }],
      `view-mode--${viewMode}`,
    );
  });

export const createViewMode = (state: EditorToolbarState) => {
  const value = state.viewMode ?? 'source';
  const viewModeGroupAction = createViewModeGroupAction(value);
  const viewModeActions = createViewModeActions(value);
  return {
    nodes: [viewModeGroupAction as NodeArg<any>, ...viewModeActions],
    edges: [
      { source: 'root', target: 'viewMode' },
      ...viewModeActions.map(({ id }) => ({ source: viewModeGroupAction.id, target: id })),
    ],
  };
};
