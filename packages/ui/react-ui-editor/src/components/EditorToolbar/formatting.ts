//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type NodeArg } from '@dxos/app-graph';
import { type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { addLink, Inline, removeLink, setStyle, type Formatting } from '../../extensions';

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
  } as ToolbarMenuActionGroupProperties);

const createFormattingActions = (formatting: Formatting, getView: () => EditorView) =>
  Object.entries(formats).map(([type, icon]) => {
    const checked = !!formatting[type as keyof Formatting];
    return createEditorAction(
      type,
      () => {
        const view = getView();
        if (!view) {
          return;
        }

        if (type === 'link') {
          checked ? removeLink(view) : addLink()(view);
          return;
        }

        const inlineType =
          type === 'strong'
            ? Inline.Strong
            : type === 'emphasis'
              ? Inline.Emphasis
              : type === 'strikethrough'
                ? Inline.Strikethrough
                : Inline.Code;
        setStyle(inlineType, !checked)(view);
      },
      { checked, icon },
    );
  });

export const createFormatting = (state: EditorToolbarState, getView: () => EditorView) => {
  const formattingGroupAction = createFormattingGroup(state);
  const formattingActions = createFormattingActions(state, getView);
  return {
    nodes: [formattingGroupAction as NodeArg<any>, ...formattingActions],
    edges: [
      { source: 'root', target: 'formatting' },
      ...formattingActions.map(({ id }) => ({ source: formattingGroupAction.id, target: id })),
    ],
  };
};
