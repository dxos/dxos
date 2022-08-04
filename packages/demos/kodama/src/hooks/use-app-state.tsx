//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, createContext, useContext, useMemo, useReducer } from 'react';

import { PublicKey } from '@dxos/protocols';

export type AppState = {
  debug?: boolean
  path: string[] // TODO(burdon): Change to hierarchical module dot string.
  partyKey?: PublicKey
}

export interface ActionHandler {
  setPath (path: string[]): void
  setPartyKey (partyKey: PublicKey): void
}

enum ActionType {
  SET_PATH,
  SET_PARTY_KEY
}

type Action = {
  type: ActionType
  value: any
}

const appStateReducer = (state: AppState, action: Action) => {
  switch (action.type) {
    case ActionType.SET_PATH: {
      return {
        ...state,
        path: action.value
      };
    }

    case ActionType.SET_PARTY_KEY: {
      return {
        ...state,
        partyKey: action.value
      };
    }
  }

  return state;
};

const AppStateContext = createContext<[AppState, ActionHandler] | undefined>(undefined);

export const AppStateProvider: FC<{
  children: ReactNode
  debug?: boolean
}> = ({
  children,
  debug
}) => {
  const [state, dispatch] = useReducer(appStateReducer, { debug, path: [] });
  const handler = useMemo<ActionHandler>(() => ({
    setPath: (path: string[]) => {
      dispatch({ type: ActionType.SET_PATH, value: path });
    },
    setPartyKey: (partyKey: PublicKey) => {
      dispatch({ type: ActionType.SET_PARTY_KEY, value: partyKey });
    }
  }), [dispatch]);

  return (
    <AppStateContext.Provider value={[state, handler]}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  return useContext(AppStateContext)!;
};
