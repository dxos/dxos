//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type NodeArg } from '@dxos/app-graph';
import { type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { setHeading } from '../../extensions';
import { translationKey } from '../../translations';

import { type EditorToolbarState, createEditorAction, createEditorActionGroup } from './util';

const createHeadingGroupAction = (value: string) =>
  createEditorActionGroup(
    'heading',
    {
      variant: 'dropdownMenu',
      applyActive: true,
      selectCardinality: 'single',
      value,
    } as ToolbarMenuActionGroupProperties,
    'ph--text-h--regular',
  );

const createHeadingActions = (getView: () => EditorView) =>
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
      `heading--${levelStr}`,
      {
        label: ['heading level label', { count: level, ns: translationKey }],
        icon,
      },
      () => setHeading(level)(getView()),
    );
  });

const computeHeadingValue = (state: EditorToolbarState) => {
  const blockType = state ? state.blockType : 'paragraph';
  const heading = blockType && /heading(\d)/.exec(blockType);
  return heading ? heading[1] : blockType === 'paragraph' || !blockType ? '0' : '';
};

export const createHeadings = (state: EditorToolbarState, getView: () => EditorView) => {
  const headingValue = computeHeadingValue(state);
  const headingGroupAction = createHeadingGroupAction(headingValue);
  const headingActions = createHeadingActions(getView);
  return {
    nodes: [headingGroupAction as NodeArg<any>, ...headingActions],
    edges: [
      { source: 'root', target: 'heading' },
      ...headingActions.map(({ id }) => ({ source: headingGroupAction.id, target: id })),
    ],
  };
};
