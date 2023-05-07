//
// Copyright 2023 DXOS.org
//

import React, { Dispatch, PropsWithChildren, createContext, useContext, useReducer, Reducer } from 'react';

import { raise } from '@dxos/debug';

//
// App
//

export type AppAction = {
  type: string;
  data: any;
};

type AppContextType<T = {}> = {
  state: T;
  dispatch: Dispatch<any>;
};

const AppContext = createContext<AppContextType<any> | undefined>(undefined);

export const AppContextProvider = <T = {},>({
  children,
  reducer,
  initialState
}: PropsWithChildren<{ initialState: T; reducer: (state: T, action: AppAction) => T }>) => {
  const [state, dispatch] = useReducer<Reducer<T, AppAction>>(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppState = () => {
  const { state } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  return state;
};

export const useAppReducer = () => {
  const { dispatch } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  return dispatch;
};
