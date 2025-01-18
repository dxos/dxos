//
// Copyright 2025 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

import { type MenuContextValue } from '../defs';

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
