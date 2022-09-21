//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, createContext, useContext, useMemo, useReducer } from 'react';

import { PublicKey } from '@dxos/keys';

export type AppState = {
  debug?: boolean
  error?: string
  partyKey?: PublicKey
}

export interface ActionHandler {
  setError (error: Error | string): void
  setPartyKey (partyKey: PublicKey): void
}

enum ActionType {
  SET_ERROR,
  SET_PARTY_KEY
}

type Action = {
  type: ActionType
  value: any
}

const appStateReducer = (state: AppState, action: Action) => {
  switch (action.type) {
    case ActionType.SET_ERROR: {
      return {
        ...state,
        error: action.value
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
  const [state, dispatch] = useReducer(appStateReducer, { debug });
  const handler = useMemo<ActionHandler>(() => ({
    setError: (error: Error | string) => {
      dispatch({ type: ActionType.SET_ERROR, value: error });
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
