//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, createContext, useContext, useMemo, useReducer } from 'react';

import { PublicKey } from '@dxos/keys';

export type AppState = {
  debug?: boolean;
  error?: string;
  spaceKey?: PublicKey;
};

export interface ActionHandler {
  setError(error: Error | string): void;
  setspaceKey(spaceKey: PublicKey): void;
}

enum ActionType {
  SET_ERROR,
  SET_space_key
}

type Action = {
  type: ActionType;
  value: any;
};

const appStateReducer = (state: AppState, action: Action) => {
  switch (action.type) {
    case ActionType.SET_ERROR: {
      return {
        ...state,
        error: action.value
      };
    }
    case ActionType.SET_space_key: {
      return {
        ...state,
        spaceKey: action.value
      };
    }
  }

  return state;
};

const AppStateContext = createContext<[AppState, ActionHandler] | undefined>(undefined);

export const AppStateProvider: FC<{
  children: ReactNode;
  debug?: boolean;
}> = ({ children, debug }) => {
  const [state, dispatch] = useReducer(appStateReducer, { debug });
  const handler = useMemo<ActionHandler>(
    () => ({
      setError: (error: Error | string) => {
        dispatch({ type: ActionType.SET_ERROR, value: error });
      },
      setspaceKey: (spaceKey: PublicKey) => {
        dispatch({ type: ActionType.SET_space_key, value: spaceKey });
      }
    }),
    [dispatch]
  );

  return <AppStateContext.Provider value={[state, handler]}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  return useContext(AppStateContext)!;
};
