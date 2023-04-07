//
// Copyright 2023 DXOS.org
//

import React, { Context, FC, ReactNode, createContext, useContext, useReducer } from 'react';

import { Space } from '@dxos/client';
import { raise } from '@dxos/debug';

import { FrameDef } from '../registry';

//
// Global app state.
//

// TODO(burdon): Make extensible? Or just an aspect for frames?

export type AppState = {
  fullscreen?: boolean;
};

export type AppContext = {
  state: AppState;
  setFullscreen: (fullscreen: boolean) => void;
};

type ActionType = {
  type: 'set-fullscreen';
};

type SetFullscreenAction = ActionType & {
  fullscreen: boolean;
};

type Action = SetFullscreenAction;

const AppContextImpl: Context<AppContext | undefined> = createContext<AppContext | undefined>(undefined);

export const AppContextProvider: FC<{ children: ReactNode; initialState: AppState }> = ({ children, initialState }) => {
  const [state, dispatch] = useReducer((state: AppState, action: Action) => {
    switch (action.type) {
      case 'set-fullscreen': {
        const { fullscreen } = action as SetFullscreenAction;
        return { ...state, fullscreen };
      }
    }

    return state;
  }, initialState ?? {});

  const context: AppContext = {
    state,
    setFullscreen: (fullscreen: boolean) => {
      dispatch({ type: 'set-fullscreen', fullscreen });
    }
  };

  return <AppContextImpl.Provider value={context}>{children}</AppContextImpl.Provider>;
};

export const useAppState = (): AppState => {
  const { state } = useContext(AppContextImpl) ?? raise(new Error('Missing AppStateContext.'));
  return state;
};

export const useAppContext = (): AppContext => {
  return useContext(AppContextImpl) ?? raise(new Error('Missing AppStateContext.'));
};

//
// Frame context.
//

export type FrameState = {
  space?: Space;
  frame?: FrameDef<any>;
  objectId?: string;
};

export type FrameContextType = FrameState & {
  // TODO(burdon): Event handler/reducer (e.g., fullscreen).
  onStateChange: (state: FrameState) => void;

  // TODO(burdon): Generalize.
  fullscreen?: boolean;
};

export const FrameContext: Context<FrameContextType | undefined> = createContext<FrameContextType | undefined>(
  undefined
);

export const useFrameContext = (): FrameContextType => {
  const context = useContext(FrameContext)!;
  return context!;
};

// TODO(burdon): Rename.
export const useFrameRouter = () => {
  const { onStateChange } = useContext(FrameContext)!;
  return (state: FrameState) => onStateChange(state);
};
