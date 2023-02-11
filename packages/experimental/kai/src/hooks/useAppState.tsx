//
// Copyright 2022 DXOS.org
//

import React, { Context, FC, ReactNode, createContext, useContext, useReducer } from 'react';

import { Space } from '@dxos/client';
import { raise } from '@dxos/debug';

import { BotManager } from './useBots';

export type AppState = {
  // Debug info.
  debug?: boolean;

  // Dev mode (auto profile, simple invitations).
  dev?: boolean;

  // PWA mode.
  pwa?: boolean;

  // Active frames.
  frames?: string[];

  // Active bots.
  bots?: string[];
};

type Action = {
  type: 'set-active-bot' | 'set-active-frame';
};

type SetBotAction = Action & {
  botId: string;
  active: boolean;
  space?: Space;
};

type SetFrameAction = Action & {
  frameId: string;
  active: boolean;
};

type ActionType = SetBotAction | SetFrameAction;

// TODO(burdon): Inject.
const botManager = new BotManager();

const reducer = (state: AppState, action: ActionType): AppState => {
  switch (action.type) {
    // TODO(burdon): Activate bot.
    case 'set-active-bot': {
      const { botId, active, space } = action as SetBotAction;
      const bots = (state.bots ?? []).filter((bot) => bot !== botId);
      if (active) {
        bots.push(botId);
        botManager.start(botId, space!);
      }

      return { ...state, bots };
    }

    case 'set-active-frame': {
      const { frameId, active } = action as SetFrameAction;
      const frames = (state.frames ?? []).filter((frame) => frame !== frameId);
      if (active) {
        frames.push(frameId);
      }

      return { ...state, frames };
    }

    default: {
      throw new Error(`Invalid action: ${JSON.stringify(action)}`);
    }
  }
};

export type AppReducer = {
  state: AppState;
  setActiveBot: (id: string, active: boolean, space?: Space) => void;
  setActiveFrame: (id: string, active: boolean) => void;
};

export const AppStateContext: Context<AppReducer | undefined> = createContext<AppReducer | undefined>(undefined);

// TODO(burdon): Implement reducer.
// https://beta.reactjs.org/learn/scaling-up-with-reducer-and-context
export const AppStateProvider: FC<{ children: ReactNode; initialState?: AppState }> = ({ children, initialState }) => {
  const [state, dispatch] = useReducer(reducer, initialState ?? {});

  const value: AppReducer = {
    state,
    setActiveBot: (id: string, active: boolean, space?: Space) => {
      dispatch({ type: 'set-active-bot', botId: id, active, space });
    },
    setActiveFrame: (id: string, active: boolean) => {
      dispatch({ type: 'set-active-frame', frameId: id, active });
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
