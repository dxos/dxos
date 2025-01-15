//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';
import { type DeepWriteable } from '@dxos/util';

import { createEditorAction, createEditorActionGroup } from './util';
import { type EditorAction, type EditorViewMode } from '../../extensions';
import { translationKey } from '../../translations';

const viewModeGroupAction = createEditorActionGroup('viewMode', {
  variant: 'dropdownMenu',
  applyActiveIcon: true,
  selectCardinality: 'single',
} as ToolbarActionGroupProperties);

const viewModeActions = Object.entries({
  preview: 'ph--eye--regular',
  source: 'ph--pencil-simple--regular',
  readonly: 'ph--pencil-slash--regular',
}).map(([viewMode, icon]) => {
  return createEditorAction({ type: 'view-mode', data: viewMode }, icon, [
    `${viewMode} mode label`,
    { ns: translationKey },
  ]);
});

export const useViewModes = (graph: Graph, mode: EditorViewMode) => {
  useEffect(() => {
    graph._addNodes([viewModeGroupAction as NodeArg<any>, ...viewModeActions]);
    graph._addEdges(viewModeActions.map(({ id }) => ({ source: viewModeGroupAction.id, target: id })));
  }, [graph]);

  useEffect(() => {
    invariant(graph);
    const viewMode = graph.findNode('viewMode');
    invariant(viewMode);
    (viewMode as DeepWriteable<ToolbarActionGroup>).properties.value = mode;
    graph.actions(viewMode)?.forEach((viewModeAction) => {
      (viewModeAction as DeepWriteable<EditorAction>).properties.checked = mode === viewModeAction.id;
    });
  }, [mode, graph]);

  return viewModeGroupAction;
};
