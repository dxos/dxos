//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { type ToolbarContextValue } from './defs';

export const ToolbarContext = createContext<ToolbarContextValue>({
  iconSize: 5,
  onAction: () => {},
  resolveGroupItems: () => [],
});

export const useToolbar = () => useContext(ToolbarContext);
