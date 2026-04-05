//
// Copyright 2025 DXOS.org
//

import {
  type MenuItemGroup,
  type ToolbarMenuActionGroupProperties,
  createMenuAction,
  createMenuItemGroup,
} from '@dxos/react-ui-menu';
import { type MenuActionProperties } from '@dxos/ui-types';

import { translationKey } from '../../translations';

export const createEditorMenuAction = (id: string, props: Partial<MenuActionProperties>, invoke: () => void) => {
  const { label = [`${id}.label`, { ns: translationKey }], ...rest } = props;
  return createMenuAction(id, invoke, { label, ...rest });
};

export const createEditorMenuItemGroup = (
  id: string,
  props: Partial<ToolbarMenuActionGroupProperties>,
): MenuItemGroup<ToolbarMenuActionGroupProperties> => {
  const { label = [`${id}.label`, { ns: translationKey }], ...rest } = props;
  return createMenuItemGroup(id, { label, iconOnly: true, ...rest } as ToolbarMenuActionGroupProperties);
};
