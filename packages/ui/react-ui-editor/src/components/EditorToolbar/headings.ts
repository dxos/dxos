//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { translationKey } from '../../translations';

const createHeadingGroupAction = (value: string) =>
  createEditorActionGroup(
    'heading',
    {
      variant: 'dropdownMenu',
      applyActiveIcon: true,
      selectCardinality: 'single',
      value,
    } as ToolbarActionGroupProperties,
    'ph--text-h--regular',
  );

const createHeadingActions = (value: string) =>
  Object.entries({
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
      { type: 'heading', data: level, checked: value === levelStr },
      icon,
      ['heading level label', { count: level, ns: translationKey }],
      `heading--${levelStr}`,
    );
  });

const computeHeadingValue = (state: EditorToolbarState) => {
  const blockType = state ? state.blockType : 'paragraph';
  const header = blockType && /heading(\d)/.exec(blockType);
  return header ? header[1] : blockType === 'paragraph' || !blockType ? '0' : '';
};

export const mountHeadingActions = (graph: Graph, state: EditorToolbarState): [ToolbarActionGroup, () => void] => {
  const unsubscribe = effect(() => {
    const headingValue = computeHeadingValue(state);
    const headingGroupAction = createHeadingGroupAction(headingValue);
    const headingActions = createHeadingActions(headingValue);
    // @ts-ignore
    graph._addNodes([headingGroupAction as NodeArg<any>, ...headingActions]);
    // @ts-ignore
    graph._addEdges(headingActions.map(({ id }) => ({ source: headingGroupAction.id, target: id })));
  });
  return [graph.findNode('heading') as ToolbarActionGroup, unsubscribe];
};
