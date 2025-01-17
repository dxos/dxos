//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { type Formatting, type PayloadType } from '../../extensions';

const formats = {
  strong: 'ph--text-b--regular',
  emphasis: 'ph--text-italic--regular',
  strikethrough: 'ph--text-strikethrough--regular',
  code: 'ph--code--regular',
  link: 'ph--link--regular',
};

const createFormattingGroup = (formatting: Formatting) =>
  createEditorActionGroup('formatting', {
    variant: 'toggleGroup',
    selectCardinality: 'multiple',
    value: Object.keys(formats).filter((key) => !!formatting[key as keyof Formatting]),
  } as ToolbarActionGroupProperties);

const createFormattingActions = (formatting: Formatting) =>
  Object.entries(formats).map(([type, icon]) =>
    createEditorAction({ type: type as PayloadType, checked: !!formatting[type as keyof Formatting] }, icon),
  );

export const mountFormatting = (graph: Graph, state: EditorToolbarState): [ToolbarActionGroup, () => void] => {
  const unsubscribe = effect(() => {
    const formattingGroupAction = createFormattingGroup(state);
    const formattingActions = createFormattingActions(state);
    // @ts-ignore
    graph._addNodes([formattingGroupAction as NodeArg<any>, ...formattingActions]);
    // @ts-ignore
    graph._addEdges(formattingActions.map(({ id }) => ({ source: formattingGroupAction.id, target: id })));
  });
  return [graph.findNode('formatting') as ToolbarActionGroup, unsubscribe];
};
