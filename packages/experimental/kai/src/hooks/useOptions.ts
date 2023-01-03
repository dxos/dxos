//
// Copyright 2022 DXOS.org
//

import { Context, createContext, useContext } from 'react';

type OptionsContextType = {
  debug: boolean;
};

export const OptionsContext: Context<OptionsContextType> = createContext<OptionsContextType>({ debug: false });

export const useOptions = (): OptionsContextType => {
  return useContext(OptionsContext)!;
};
