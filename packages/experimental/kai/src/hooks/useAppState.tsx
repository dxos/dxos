//
// Copyright 2022 DXOS.org
//

import React, { Context, FC, ReactNode, createContext, useContext, useReducer } from 'react';

import { Config } from '@dxos/client';
import { raise } from '@dxos/debug';
import { useConfig } from '@dxos/react-client';

export type AppState = {
  // Debug info.
  debug?: boolean;

  // Dev mode (auto identity, simple invitations).
  dev?: boolean;

  // PWA mode.
  pwa?: boolean;

  // Fullscreen.
  fullscreen?: boolean;

  // Chat panel.
  chat?: boolean;

  // Active frames.
  frames?: string[];
};

type ActionType = {
  type: 'set-active-frame' | 'set-fullscreen' | 'set-chat';
};

type SetFrameAction = ActionType & {
  frameId: string;
  active: boolean;
};

type SetFullscreenAction = ActionType & {
  fullscreen: boolean;
};

type SetChatAction = ActionType & {
  chat: boolean;
};

type Action = SetFrameAction | SetFullscreenAction | SetChatAction;

const reducer =
  (config: Config) =>
  (state: AppState, action: Action): AppState => {
    switch (action.type) {
      case 'set-active-frame': {
        const { frameId, active } = action as SetFrameAction;
        const frames = (state.frames ?? []).filter((frame) => frame !== frameId);
        if (active) {
          frames.push(frameId);
        }

        return { ...state, frames };
      }

      case 'set-fullscreen': {
        const { fullscreen } = action as SetFullscreenAction;
        return { ...state, fullscreen };
      }

      case 'set-chat': {
        const { chat } = action as SetChatAction;
        return { ...state, chat };
      }

      default: {
        throw new Error(`Invalid action: ${JSON.stringify(action)}`);
      }
    }
  };

export type AppReducer = {
  state: AppState;
  setFullscreen: (fullscreen: boolean) => void;
  setChat: (chat: boolean) => void;
  setActiveFrame: (id: string, active: boolean) => void;
};

const AppStateContext: Context<AppReducer | undefined> = createContext<AppReducer | undefined>(undefined);

// TODO(burdon): Implement reducer.
// https://beta.reactjs.org/learn/scaling-up-with-reducer-and-context
export const AppStateProvider: FC<{ children: ReactNode; initialState?: AppState }> = ({ children, initialState }) => {
  const config = useConfig();
  const [state, dispatch] = useReducer(reducer(config), initialState ?? {});

  const value: AppReducer = {
    state,
    setFullscreen: (fullscreen: boolean) => {
      dispatch({ type: 'set-fullscreen', fullscreen });
    },
    setChat: (chat: boolean) => {
      dispatch({ type: 'set-chat', chat });
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
  const { state } = useContext(AppStateContext) ?? raise(new Error('Missing AppStateContext.'));
  return state;
};

export const useAppReducer = (): AppReducer => {
  return useContext(AppStateContext) ?? raise(new Error('Missing AppStateContext.'));
};
