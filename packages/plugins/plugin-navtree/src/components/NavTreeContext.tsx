//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { type NavTreeContextValue } from './types';

export const NavTreeContext = createContext<NavTreeContextValue>({
  getActions: () => ({ actions: [], groupedActions: {} }),
  loadDescendents: () => {},
  renderItemEnd: () => null,
});

export const useNavTreeContext = () => useContext(NavTreeContext);
