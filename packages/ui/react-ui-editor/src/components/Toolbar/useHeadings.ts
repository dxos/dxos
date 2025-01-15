//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';
import { type DeepWriteable } from '@dxos/util';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { type EditorAction } from '../../extensions';
import { translationKey } from '../../translations';

const headingGroupAction = createEditorActionGroup(
  'heading',
  {
    variant: 'dropdownMenu',
    applyActiveIcon: true,
    selectCardinality: 'single',
  } as ToolbarActionGroupProperties,
  'ph--text-h--regular',
);

const headingActions = Object.entries({
  '0': 'ph--paragraph--regular',
  '1': 'ph--text-h-one--regular',
  '2': 'ph--text-h-two--regular',
  '3': 'ph--text-h-three--regular',
  '4': 'ph--text-h-four--regular',
  '5': 'ph--text-h-five--regular',
  '6': 'ph--text-h-six--regular',
}).map(([levelStr, icon]) => {
  const level = parseInt(levelStr);
  return createEditorAction(
    { type: 'heading', data: level },
    icon,
    ['heading level label', { count: level, ns: translationKey }],
    `heading--${levelStr}`,
  );
});

export const useHeadings = (graph: Graph, state: EditorToolbarState) => {
  useEffect(() => {
    graph._addNodes([headingGroupAction as NodeArg<any>, ...headingActions]);
    graph._addEdges(headingActions.map(({ id }) => ({ source: headingGroupAction.id, target: id })));
  }, [graph]);

  const headingValue = useMemo(() => {
    const blockType = state ? state.blockType : 'paragraph';
    const header = blockType && /heading(\d)/.exec(blockType);
    return header ? header[1] : blockType === 'paragraph' || !blockType ? '0' : undefined;
  }, [state?.blockType]);

  useEffect(() => {
    invariant(graph);
    const heading = graph.findNode('heading');
    invariant(heading);
    (heading as DeepWriteable<ToolbarActionGroup>).properties.value = headingValue ?? '';
    graph.actions(heading)?.forEach((headingAction) => {
      (headingAction as DeepWriteable<EditorAction>).properties.checked =
        `${headingAction.properties.data}` === headingValue;
    });
  }, [headingValue, graph]);

  return headingGroupAction;
};
