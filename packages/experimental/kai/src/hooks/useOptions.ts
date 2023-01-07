//
// Copyright 2022 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { AppView } from './views';

export type OptionsContextType = {
  debug: boolean;
  views: AppView[];
};

export const OptionsContext: Context<OptionsContextType> = createContext<OptionsContextType>({
  debug: false,
  views: [AppView.CARDS]
});

export const useOptions = (): OptionsContextType => {
  return useContext(OptionsContext)!;
};
