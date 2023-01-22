//
// Copyright 2023 DXOS.org
//

import React, { Context, createContext, Dispatch, FC, ReactNode, SetStateAction, useContext, useState } from 'react';

import { PublicKey, Space } from '@dxos/client';

export type DevtoolsContextType = {
  space?: Space;
  feedKey?: PublicKey;
};

export type DevtoolsContextState = [DevtoolsContextType, Dispatch<SetStateAction<DevtoolsContextType>>];

export const DevtoolsContext: Context<DevtoolsContextState | undefined> = createContext<
  DevtoolsContextState | undefined
>(undefined);

export const DevtoolsContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const state = useState<DevtoolsContextType>({});

  return <DevtoolsContext.Provider value={state}>{children}</DevtoolsContext.Provider>;
};

export const useDevtoolsState = (): DevtoolsContextType => {
  const [state] = useContext(DevtoolsContext)!;
  return state;
};

export const useDevtoolsDispatch = (): Dispatch<SetStateAction<DevtoolsContextType>> => {
  const [, dispatch] = useContext(DevtoolsContext)!;
  return dispatch;
};
