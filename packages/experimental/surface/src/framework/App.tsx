//
// Copyright 2023 DXOS.org
//

import React, { Dispatch, PropsWithChildren, createContext, useContext, useReducer, Reducer } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { raise } from '@dxos/debug';

import { Plugin } from './Plugin';

//
// App
//

export type AppAction = {
  type: string;
  data: any;
};

export type RouteAdapter<T> = {
  paramsToState: (params: any) => T;
  stateToPath: (state?: T) => string;
};

type AppContextType<T = {}> = {
  state: T;
  dispatch: Dispatch<any>;
  plugins: Plugin[];
  routeAdapter?: RouteAdapter<T>;
};

const AppContext = createContext<AppContextType<any> | undefined>(undefined);

type AppContextProviderProps<T> = {
  initialState: T;
  plugins?: Plugin[];
  routeAdapter?: RouteAdapter<T>;
  reducer: (state: T, action: AppAction) => T;
};

export const AppContextProvider = <T = {},>({
  children,
  initialState,
  plugins = [],
  routeAdapter,
  reducer
}: PropsWithChildren<AppContextProviderProps<T>>) => {
  const [state, dispatch] = useReducer<Reducer<T, AppAction>>(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch, plugins, routeAdapter }}>{children}</AppContext.Provider>;
};

export const useAppState = () => {
  const { state, routeAdapter } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  const params = useParams();
  return { ...state, ...routeAdapter?.paramsToState?.(params) };
};

export const useAppNavigate = <T,>() => {
  const { routeAdapter } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  const navigate = useNavigate();
  return (state?: T) => navigate(routeAdapter!.stateToPath(state));
};

export const useAppReducer = () => {
  const { dispatch } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  return dispatch;
};
