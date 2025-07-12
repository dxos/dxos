//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type Rx } from '@effect-rx/rx-react';
import { useMemo } from 'react';

import { type Action } from '@dxos/app-graph';
import { live, type Live } from '@dxos/live-object';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  type MenuSeparator,
  type MenuItemGroup,
  type ToolbarMenuActionGroupProperties,
  createMenuAction,
  createMenuItemGroup,
  type ActionGraphProps,
  type MenuActionProperties,
} from '@dxos/react-ui-menu';

import type { EditorAction, Formatting } from '../../extensions';
import { EditorViewMode } from '../../types';
import { translationKey } from '../../translations';

export type EditorToolbarState = Formatting & Partial<{ viewMode: EditorViewMode }>;

export const useEditorToolbarState = (initialState: Partial<EditorToolbarState> = {}) => {
  return useMemo(() => live<EditorToolbarState>(initialState), []);
};

export type EditorToolbarFeatureFlags = Partial<{
  headings: boolean;
  formatting: boolean;
  lists: boolean;
  blocks: boolean;
  search: boolean;
  // TODO(wittjosiah): Factor out. Depend on plugin-level capabilities.
  image: () => void;
  viewMode: (mode: EditorViewMode) => void;
}>;

export type EditorToolbarActionGraphProps = {
  state: Live<EditorToolbarState>;
  getView: () => EditorView;
  // TODO(wittjosiah): Control positioning.
  customActions?: Rx.Rx<ActionGraphProps>;
};

export type EditorToolbarProps = ThemedClassName<
  EditorToolbarActionGraphProps & EditorToolbarFeatureFlags & { attendableId?: string; role?: string }
>;

export type EditorToolbarItem = EditorAction | MenuItemGroup | MenuSeparator;

export const createEditorAction = (id: string, invoke: () => void, properties: Partial<MenuActionProperties>) => {
  const { label = [`${id} label`, { ns: translationKey }], ...rest } = properties;
  return createMenuAction(id, invoke, { label, ...rest }) as Action<MenuActionProperties>;
};

export const createEditorActionGroup = (
  id: string,
  props: Omit<ToolbarMenuActionGroupProperties, 'icon'>,
  icon?: string,
) => createMenuItemGroup(id, { icon, iconOnly: true, ...props });
