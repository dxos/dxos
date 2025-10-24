//
// Copyright 2025 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo } from 'react';

import { type MenuContextValue, type MenuItem, type MenuItemGroup } from '../types';

export type MenuScopedProps<P> = P & { __menuScope?: Scope };

const MENU_NAME = 'Menu';

const [createMenuContext, createMenuScope] = createContextScope(MENU_NAME, []);

const [MenuContextProvider, useMenu] = createMenuContext<MenuContextValue>(MENU_NAME);

export const menuContextDefaults: MenuContextValue = {
  iconSize: 5,
  useGroupItems: () => null,
};

const useMenuScope = createMenuScope();

type MenuProviderProps = PropsWithChildren<Partial<MenuContextValue>>;

const MenuProvider = ({
  children,
  useGroupItems = menuContextDefaults.useGroupItems,
  iconSize = menuContextDefaults.iconSize,
  attendableId,
}: MenuProviderProps) => {
  const { scope } = useMenuScope(undefined);
  return (
    <MenuContextProvider useGroupItems={useGroupItems} iconSize={iconSize} attendableId={attendableId} scope={scope}>
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
  const { useGroupItems } = useMenu(consumerName, __menuScope);
  const groupItems = useGroupItems(group);
  return useMemo(() => propsItems ?? groupItems ?? undefined, [propsItems, groupItems]);
};

export { useMenu, createMenuScope, MenuProvider };

export type { MenuProviderProps };
