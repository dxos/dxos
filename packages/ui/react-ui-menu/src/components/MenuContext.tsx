//
// Copyright 2025 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { type MenuContextValue, type MenuItem, type MenuItemGroup } from '../defs';

export const menuContextDefaults: MenuContextValue = {
  iconSize: 5,
  onAction: () => {},
  resolveGroupItems: () => null,
};

export const MenuContext = createContext<MenuContextValue>(menuContextDefaults);

export const MenuProvider = ({
  children,
  resolveGroupItems = menuContextDefaults.resolveGroupItems,
  onAction = menuContextDefaults.onAction,
  iconSize = menuContextDefaults.iconSize,
}: PropsWithChildren<Partial<MenuContextValue>>) => {
  const contextValue = useMemo(
    () => ({ resolveGroupItems, onAction, iconSize }),
    [resolveGroupItems, onAction, iconSize],
  );
  return <MenuContext.Provider value={contextValue}>{children}</MenuContext.Provider>;
};

export const useMenu = () => useContext(MenuContext);

export const useMenuItems = (group?: MenuItemGroup, propsItems?: MenuItem[]) => {
  const { resolveGroupItems } = useMenu();
  return useMemo(() => propsItems ?? resolveGroupItems?.(group) ?? undefined, [propsItems, group, resolveGroupItems]);
};
