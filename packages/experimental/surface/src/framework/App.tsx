//
// Copyright 2023 DXOS.org
//

import React, { createContext, PropsWithChildren, useContext } from 'react';

import { raise } from '@dxos/debug';

//
// App
//

type AppContextType = {
  state: any;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider = ({ children, initialState }: PropsWithChildren<{ initialState: any }>) => {
  return <AppContext.Provider value={{ state: initialState }}>{children}</AppContext.Provider>;
};

export const useAppState = () => {
  const { state } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  return state;
};
