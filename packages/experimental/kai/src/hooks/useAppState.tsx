//
// Copyright 2022 DXOS.org
//

import React, { Context, Dispatch, SetStateAction, createContext, FC, ReactNode, useContext, useState } from 'react';

// TODO(burdon): Use reducer?
// https://beta.reactjs.org/learn/scaling-up-with-reducer-and-context

export type AppState = {
  showSidebar?: boolean;
  dummy?: number;
};

export const defaultAppState: AppState = {
  showSidebar: true,
  dummy: 100
};

export type AppStateContextType = [AppState, Dispatch<SetStateAction<AppState>>];

export const AppStateContext: Context<AppStateContextType | undefined> = createContext<AppStateContextType | undefined>(
  undefined
);

export const AppStateProvider: FC<{ children: ReactNode; initialState?: AppState }> = ({
  children,
  initialState = defaultAppState
}) => {
  const [state, setState] = useState<AppState>(initialState);
  return <AppStateContext.Provider value={[state, setState]}>{children}</AppStateContext.Provider>;
};

export const useAppState = (): AppState => {
  const [state] = useContext(AppStateContext)!;
  return state;
};

export const useAppStateDispatch = (): Dispatch<SetStateAction<AppState>> => {
  const [, setState] = useContext(AppStateContext)!;
  return setState;
};
