//
// Copyright 2022 DXOS.org
//

import React, { Context, FC, ReactNode, createContext, useContext, useReducer } from 'react';

import { raise } from '@dxos/debug';

import { BotDef } from './useBots';
import { FrameDef } from './useFrames';

export type AppState = {
  // Debug info.
  debug?: boolean;

  // Dev mode (auto profile, simple invitations).
  dev?: boolean;

  // PWA mode.
  pwa?: boolean;

  // Active frames.
  frames?: {
    defs: FrameDef[];
    active: string[];
  };

  // Active bots.
  bots?: {
    defs: BotDef[];
    active: string[];
  };
};

type Action = {
  type: string;
};

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'test': {
      console.log('TEST');
      break;
    }

    default: {
      throw new Error(`Invalid action: ${JSON.stringify(action)}`);
    }
  }

  return { ...state };
};

export type AppReducer = {
  state: AppState;
  test: () => void;
};

export const AppStateContext: Context<AppReducer | undefined> = createContext<AppReducer | undefined>(undefined);

// TODO(burdon): Implement reducer.
// https://beta.reactjs.org/learn/scaling-up-with-reducer-and-context
export const AppStateProvider: FC<{ children: ReactNode; initialState?: AppState }> = ({ children, initialState }) => {
  const [state, dispatch] = useReducer(reducer, initialState ?? {});

  const value: AppReducer = {
    state,
    test: () => {
      dispatch({ type: 'test' });
    }
  };

  // prettier-ignore
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppState => {
  const { state } = useContext(AppStateContext) ?? raise(new Error('AppStateProvider not initialized.'));
  return state;
};

export const useAppReducer = (): AppReducer => {
  return useContext(AppStateContext) ?? raise(new Error('AppStateProvider not initialized.'));
};
