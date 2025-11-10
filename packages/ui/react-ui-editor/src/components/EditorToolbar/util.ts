//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { type Action } from '@dxos/app-graph';
import { type Live, live } from '@dxos/live-object';
import {
  type ActionGraphProps,
  type MenuActionProperties,
  type MenuItemGroup,
  type MenuSeparator,
  type ToolbarMenuActionGroupProperties,
  createMenuAction,
  createMenuItemGroup,
} from '@dxos/react-ui-menu';

import type { EditorAction, Formatting } from '../../extensions';
import { translationKey } from '../../translations';
import { type EditorViewMode } from '../../types';

export type EditorToolbarState = { viewMode?: EditorViewMode } & Formatting;

export const useEditorToolbarState = (initialState: Partial<EditorToolbarState> = {}): Live<EditorToolbarState> => {
  return useMemo(() => live<EditorToolbarState>(initialState), []);
};

export type EditorToolbarActionGraphProps = {
  state: Live<EditorToolbarState>;
  getView: () => EditorView;
  // TODO(wittjosiah): Control positioning.
  customActions?: Atom.Atom<ActionGraphProps>;
};

export type EditorToolbarItem = EditorAction | MenuItemGroup | MenuSeparator;

export const createEditorAction = (id: string, props: Partial<MenuActionProperties>, invoke: () => void) => {
  const { label = [`${id} label`, { ns: translationKey }], ...rest } = props;
  return createMenuAction(id, invoke, {
    label,
    ...rest,
  }) as Action<MenuActionProperties>;
};

export const createEditorActionGroup = (
  id: string,
  props: Omit<ToolbarMenuActionGroupProperties, 'icon'>,
  icon?: string,
) => {
  const { label = [`${id} label`, { ns: translationKey }], ...rest } = props;
  return createMenuItemGroup(id, {
    label,
    icon,
    iconOnly: true,
    ...rest,
  });
};
