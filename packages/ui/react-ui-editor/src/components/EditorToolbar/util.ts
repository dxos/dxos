//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { create, type ReactiveObject } from '@dxos/live-object';
import { type Label, type ThemedClassName } from '@dxos/react-ui';
import {
  type MenuSeparator,
  type MenuItemGroup,
  type ToolbarMenuActionGroupProperties,
  type MenuActionProperties,
  createMenuAction,
  createMenuItemGroup,
  type ActionGraphProps,
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
  // TODO(wittjosiah): Control positioning.
  customActions?: () => ActionGraphProps;
  onAction: (action: EditorAction) => void;
};

export type EditorToolbarProps = ThemedClassName<
  EditorToolbarActionGraphProps & EditorToolbarFeatureFlags & { attendableId?: string; role?: string }
>;

export type EditorToolbarItem = EditorAction | MenuItemGroup | MenuSeparator;

export const createEditorAction = (
  payload: EditorActionPayload & Partial<MenuActionProperties>,
  icon: string,
  label: Label = [`${payload.type} label`, { ns: translationKey }],
  id: string = payload.type,
) => createMenuAction(id, { icon, label, ...payload }) as EditorAction;

export const createEditorActionGroup = (
  id: string,
  props: Omit<ToolbarMenuActionGroupProperties, 'icon'>,
  icon?: string,
) => createMenuItemGroup(id, { icon, ...props });

export const editorToolbarSearch = createEditorAction({ type: 'search' }, 'ph--magnifying-glass--regular');
