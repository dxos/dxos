//
// Copyright 2022 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { AppView } from '../app';

export type OptionsContextType = {
  // Debug info.
  debug: boolean;
  // Auto-create data.
  demo: boolean;
  // View selector.
  views: AppView[];
};

export const OptionsContext: Context<OptionsContextType | undefined> = createContext<OptionsContextType | undefined>(
  undefined
);

export const useOptions = (): OptionsContextType => {
  return useContext(OptionsContext)!;
};
