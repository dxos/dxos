//
// Copyright 2022 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { AppView } from './views';

export type OptionsContextType = {
  // Debug info.
  debug: boolean;
  // Auto-create data.
  demo: boolean;
  // View selector.
  views: AppView[];
};

export const OptionsContext: Context<OptionsContextType> = createContext<OptionsContextType>({
  debug: false,
  demo: true,
  views: [AppView.DASHBOARD]
});

export const useOptions = (): OptionsContextType => {
  return useContext(OptionsContext)!;
};
