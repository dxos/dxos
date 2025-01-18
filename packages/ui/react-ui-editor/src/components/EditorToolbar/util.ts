//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { ACTION_GROUP_TYPE, ACTION_TYPE, actionGroupSymbol } from '@dxos/app-graph';
import { create, type ReactiveObject } from '@dxos/live-object';
import { type Label, type ThemedClassName } from '@dxos/react-ui';
import {
  type MenuSeparator,
  type MenuItemGroup,
  type ToolbarActionGroupProperties,
  type MenuActionProperties,
} from '@dxos/react-ui-menu';

import type { EditorAction, EditorActionPayload, EditorViewMode, Formatting } from '../../extensions';
import { translationKey } from '../../translations';

export type EditorToolbarState = Formatting &
  Partial<{ comment: boolean; viewMode: EditorViewMode; selection: boolean }>;

export const useEditorToolbarState = (initialState: Partial<EditorToolbarState> = {}) => {
  return useMemo(() => create<EditorToolbarState>(initialState), []);
};

export type EditorToolbarFeatureFlags = Partial<{
  headings: boolean;
  formatting: boolean;
  lists: boolean;
  blocks: boolean;
  comment: boolean;
  search: boolean;
  viewMode: boolean;
}>;

export type EditorToolbarActionGraphProps = {
  state: ReactiveObject<EditorToolbarState>;
  onAction: (action: EditorAction) => void;
};

export type EditorToolbarProps = ThemedClassName<EditorToolbarActionGraphProps & EditorToolbarFeatureFlags>;

export type EditorToolbarItem = EditorAction | MenuItemGroup | MenuSeparator;

const noop = () => {};

export const createEditorAction = (
  payload: EditorActionPayload & Partial<MenuActionProperties>,
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
  }) satisfies MenuItemGroup;

export const editorToolbarGap = {
  id: 'gap',
  type: '@dxos/react-ui-toolbar/separator',
  properties: { variant: 'gap' },
  data: undefined as never,
} satisfies MenuSeparator;

export const editorToolbarSearch = createEditorAction({ type: 'search' }, 'ph--magnifying-glass--regular');

export const edgesArrayToRecord = (edges: { source: string; target: string }[]): Record<string, string[]> => {
  return Object.fromEntries(
    Object.entries(
      edges.reduce((acc: Record<string, { inbound: string[]; outbound: string[] }>, { source, target }) => {
        if (!acc[source]) {
          acc[source] = { inbound: [], outbound: [] };
        }
        if (!acc[target]) {
          acc[target] = { inbound: [], outbound: [] };
        }

        const sourceEdges = acc[source];
        if (!sourceEdges.outbound.includes(target)) {
          sourceEdges.outbound.push(target);
        }

        const targetEdges = acc[target];
        if (!targetEdges.inbound.includes(source)) {
          targetEdges.inbound.push(source);
        }

        return acc;
      }, {}),
    ).map(([id, { outbound }]): [string, string[]] => [id, outbound]),
  );
};
