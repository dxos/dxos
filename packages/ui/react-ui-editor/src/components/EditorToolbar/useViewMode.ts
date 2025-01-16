//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import { type ReactiveObject } from '@dxos/live-object';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';
import { type DeepWriteable } from '@dxos/util';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { type EditorAction } from '../../extensions';
import { translationKey } from '../../translations';

const viewModeGroupAction = createEditorActionGroup(
  'viewMode',
  {
    variant: 'dropdownMenu',
    applyActiveIcon: true,
    selectCardinality: 'single',
  } as ToolbarActionGroupProperties,
  'ph--eye--regular',
);

const viewModeActions = Object.entries({
  preview: 'ph--eye--regular',
  source: 'ph--pencil-simple--regular',
  readonly: 'ph--pencil-slash--regular',
}).map(([viewMode, icon]) => {
  return createEditorAction(
    { type: 'view-mode', data: viewMode },
    icon,
    [`${viewMode} mode label`, { ns: translationKey }],
    `view-mode--${viewMode}`,
  );
});

export const useViewModes = (graph: Graph, state: ReactiveObject<EditorToolbarState>) => {
  useEffect(() => {
    // @ts-ignore
    graph._addNodes([viewModeGroupAction as NodeArg<any>, ...viewModeActions]);
    // @ts-ignore
    graph._addEdges(viewModeActions.map(({ id }) => ({ source: viewModeGroupAction.id, target: id })));
  }, [graph]);

  useEffect(() => {
    invariant(graph);
    const viewMode = graph.findNode('viewMode');
    invariant(viewMode);
    (viewMode as DeepWriteable<ToolbarActionGroup>).properties.value = state.viewMode ?? 'source';
    graph.actions(viewMode)?.forEach((viewModeAction) => {
      (viewModeAction as DeepWriteable<EditorAction>).properties.checked = state.viewMode === viewModeAction.id;
    });
  }, [state.viewMode, graph]);

  return viewModeGroupAction;
};
