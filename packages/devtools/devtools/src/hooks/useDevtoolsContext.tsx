//
// Copyright 2023 DXOS.org
//

import React, {
  type Context,
  createContext,
  type Dispatch,
  type FC,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from 'react';

import { type Space } from '@dxos/client/echo';
import { type PublicKey } from '@dxos/react-client';

export type DevtoolsContextType = {
  space?: Space;
  feedKey?: PublicKey;
  haloSpaceKey?: PublicKey;
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
