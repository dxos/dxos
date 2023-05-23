//
// Copyright 2022 DXOS.org
//

import React, { Context, FC, ReactNode, createContext, useContext, useReducer } from 'react';

import { raise } from '@dxos/debug';

export const defaultFrameId = 'dxos.module.frame.stack';

// prettier-ignore
export const defaultFrames = [
  'dxos.module.frame.stack',
  'dxos.module.frame.presenter',
  'dxos.module.frame.inbox',
  'dxos.module.frame.calendar',
  'dxos.module.frame.contact',
  'dxos.module.frame.file',
  // 'dxos.module.frame.kanban',
  // 'dxos.module.frame.table',
  // 'dxos.module.frame.note',
  'dxos.module.frame.sketch'
  // 'dxos.module.frame.chess',
  // 'dxos.module.frame.sandbox',
  // 'dxos.module.frame.maps',
  // 'dxos.module.frame.document',
  // 'dxos.module.frame.task',
  // 'dxos.module.frame.explorer'
];

// TODO(burdon): Factor out.
export const bool = (value?: string) => value === 'true' || value === '1';

export const optionsKeys = [
  'experimental.search',
  'experimental.plugins',
  'experimental.functions',
  'experimental.metagraph',
];

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
  frames: string[];

  // Show deleted.
  showDeletedObjects?: boolean;
};

const defaultAppState: AppState = {
  frames: [], // TODO(burdon): Plugins.
};

type ActionType = {
  type: 'set-active-frame' | 'set-fullscreen' | 'set-chat' | 'set-show-deleted-objects';
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

type SetShowDeletedObjects = ActionType & {
  show: boolean;
};

type Action = SetFrameAction | SetFullscreenAction | SetChatAction | SetShowDeletedObjects;

const reducer = (state: AppState, action: Action): AppState => {
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

    case 'set-show-deleted-objects': {
      const { show } = action as SetShowDeletedObjects;
      return { ...state, showDeletedObjects: show };
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
  setShowDeletedObjects: (show: boolean) => void;
};

const AppStateContext: Context<AppReducer | undefined> = createContext<AppReducer | undefined>(undefined);

// TODO(burdon): Implement reducer.
// https://beta.reactjs.org/learn/scaling-up-with-reducer-and-context
export const AppStateProvider: FC<{ children: ReactNode; initialState?: Partial<AppState> }> = ({
  children,
  initialState,
}) => {
  const [state, dispatch] = useReducer(reducer, Object.assign({}, defaultAppState, initialState));

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
    },
    setShowDeletedObjects: (show: boolean) => {
      dispatch({ type: 'set-show-deleted-objects', show });
    },
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
