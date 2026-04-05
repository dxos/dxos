//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Node } from '@dxos/app-graph';
import { setHeading } from '@dxos/ui-editor';

import { translationKey } from '../../translations';

import { createEditorMenuAction, createEditorMenuItemGroup } from './actions';
import { type EditorToolbarState } from './useEditorToolbar';

const createHeadingGroupAction = (value: string) =>
  createEditorMenuItemGroup('heading', {
    icon: 'ph--text-h--regular',
    variant: 'dropdownMenu',
    applyActive: true,
    selectCardinality: 'single',
    value,
  });

const createHeadingActions = (currentLevel: string, getView: () => EditorView) =>
  Object.entries({
    0: 'ph--paragraph--regular',
    1: 'ph--text-h-one--regular',
    2: 'ph--text-h-two--regular',
    3: 'ph--text-h-three--regular',
    4: 'ph--text-h-four--regular',
    5: 'ph--text-h-five--regular',
    6: 'ph--text-h-six--regular',
  }).map(([levelStr, icon]) => {
    const level = parseInt(levelStr);
    return createEditorMenuAction(
      `heading--${levelStr}`,
      {
        label: ['heading-level.label', { count: level, ns: translationKey }],
        icon,
        checked: levelStr === currentLevel,
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
  const headingActions = createHeadingActions(headingValue, getView);
  return {
    nodes: [headingGroupAction as Node.NodeArg<any>, ...headingActions],
    edges: [
      { source: 'root', target: 'heading', relation: 'child' },
      ...headingActions.map(({ id }) => ({ source: headingGroupAction.id, target: id, relation: 'child' })),
    ],
  };
};
