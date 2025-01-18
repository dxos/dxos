//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { type MenuContextValue } from '../../defs';

export const ToolbarContext = createContext<MenuContextValue>({
  iconSize: 5,
  onAction: () => {},
  resolveGroupItems: () => [],
});

export const useToolbar = () => useContext(ToolbarContext);
