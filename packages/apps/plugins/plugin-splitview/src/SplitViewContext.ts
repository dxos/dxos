//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

export type SplitViewContextValue = {
  sidebarOpen: boolean;
  dialogContent: any;
  dialogOpen: boolean;
};

export const defaultValues: SplitViewContextValue = {
  sidebarOpen: true,
  dialogContent: 'never',
  dialogOpen: false,
};

export const SplitViewContext: Context<SplitViewContextValue> = createContext(defaultValues);

export const useSplitView = () => useContext(SplitViewContext);
