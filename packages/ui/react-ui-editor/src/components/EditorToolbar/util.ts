//
// Copyright 2025 DXOS.org
//

import { ACTION_GROUP_TYPE, ACTION_TYPE, actionGroupSymbol } from '@dxos/app-graph';
import { create, type ReactiveObject } from '@dxos/live-object';
import { type Label, type ThemedClassName } from '@dxos/react-ui';
import {
  type ToolbarSeparatorNode,
  type ToolbarActionGroup,
  type ToolbarActionGroupProperties,
} from '@dxos/react-ui-menu';

import type { EditorAction, EditorActionPayload, EditorViewMode, Formatting } from '../../extensions';
import { translationKey } from '../../translations';

export type EditorToolbarState = Formatting &
  Partial<{ comment: boolean; viewMode: EditorViewMode; selection: boolean }>;

export const useEditorToolbarState = (initialState: Partial<EditorToolbarState> = {}) => {
  return create<EditorToolbarState>(initialState);
};

export type EditorToolbarActionGraphProps = {
  state: ReactiveObject<EditorToolbarState>;
  onAction: (action: EditorAction) => void;
};

export type EditorToolbarProps = ThemedClassName<EditorToolbarActionGraphProps>;

export type EditorToolbarItem = EditorAction | ToolbarActionGroup | ToolbarSeparatorNode;

const noop = () => {};

export const createEditorAction = (
  payload: EditorActionPayload,
  icon: string,
  label: Label = [`${payload.type} label`, { ns: translationKey }],
  id: string = payload.type,
) =>
  ({
    id,
    type: ACTION_TYPE,
    properties: {
      ...payload,
      label,
      icon,
    },
    data: noop,
  }) satisfies EditorAction;

export const createEditorActionGroup = (
  id: string,
  props: Omit<ToolbarActionGroupProperties, 'label' | 'icon'>,
  icon?: string,
) =>
  ({
    id,
    type: ACTION_GROUP_TYPE,
    properties: {
      ...props,
      label: [`${id} label`, { ns: translationKey }],
      icon,
    } as ToolbarActionGroupProperties,
    data: actionGroupSymbol,
  }) satisfies ToolbarActionGroup;

export const editorToolbarGap = {
  id: 'gap',
  type: '@dxos/react-ui-toolbar/separator',
  properties: { variant: 'gap' },
  data: undefined as never,
} satisfies ToolbarSeparatorNode;

export const editorToolbarSearch = createEditorAction({ type: 'search' }, 'ph--magnifying-glass--regular');
