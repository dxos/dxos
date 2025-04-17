//
// Copyright 2025 DXOS.org
//

import { createContextScope, type Scope } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo } from 'react';

import { type Node } from '@dxos/app-graph';

import {
  type MenuActionHandler,
  type MenuAction,
  type MenuContextValue,
  type MenuItem,
  type MenuItemGroup,
} from '../defs';

export type MenuScopedProps<P> = P & { __menuScope?: Scope };

const MENU_NAME = 'GraphMenu';

const [createMenuContext, createMenuScope] = createContextScope(MENU_NAME, []);

const [MenuContextProvider, useMenu] = createMenuContext<MenuContextValue<any>>(MENU_NAME);

export const menuContextDefaults: MenuContextValue<MenuAction> = {
  iconSize: 5,
  onAction: () => {},
  resolveGroupItems: () => null,
};

const useMenuScope = createMenuScope();

const MenuProvider = <A extends Node = MenuAction>({
  children,
  resolveGroupItems = menuContextDefaults.resolveGroupItems,
  onAction = menuContextDefaults.onAction as MenuActionHandler<A>,
  iconSize = menuContextDefaults.iconSize,
  attendableId,
}: PropsWithChildren<Partial<MenuContextValue<A>>>) => {
  const { scope } = useMenuScope(undefined);
  return (
    <MenuContextProvider
      resolveGroupItems={resolveGroupItems}
      onAction={onAction}
      iconSize={iconSize}
      attendableId={attendableId}
      scope={scope}
    >
      {children}
    </MenuContextProvider>
  );
};

export const useMenuItems = (
  group?: MenuItemGroup,
  propsItems?: MenuItem[],
  consumerName: string = 'useMenuItemConsumer',
  __menuScope?: Scope,
) => {
  const { resolveGroupItems } = useMenu(consumerName, __menuScope);
  return useMemo(() => propsItems ?? resolveGroupItems?.(group) ?? undefined, [propsItems, group, resolveGroupItems]);
};

export { useMenu, createMenuScope, MenuProvider };
