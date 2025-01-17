//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { type ReactiveObject } from '@dxos/live-object';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { translationKey } from '../../translations';

const createViewModeGroupAction = (value: string) =>
  createEditorActionGroup(
    'viewMode',
    {
      variant: 'dropdownMenu',
      applyActiveIcon: true,
      selectCardinality: 'single',
      value,
    } as ToolbarActionGroupProperties,
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

export const mountViewMode = (
  graph: Graph,
  state: ReactiveObject<EditorToolbarState>,
): [ToolbarActionGroup, () => void] => {
  const unsubscribe = effect(() => {
    const value = state.viewMode ?? 'source';
    const viewModeGroupAction = createViewModeGroupAction(value);
    const viewModeActions = createViewModeActions(value);
    // @ts-ignore
    graph._addNodes([viewModeGroupAction as NodeArg<any>, ...viewModeActions]);
    // @ts-ignore
    graph._addEdges(viewModeActions.map(({ id }) => ({ source: viewModeGroupAction.id, target: id })));
  });

  return [graph.findNode('viewMode') as ToolbarActionGroup, unsubscribe];
};
