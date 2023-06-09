//
// Copyright 2023 DXOS.org
//

import React, { Context, FC, ReactNode, createContext, useContext } from 'react';

import { Space } from '@dxos/client';
import { raise } from '@dxos/debug';

import { FrameDef, FrameRegistry } from '../registry';

//
// Frame registry.
//

export type FrameRegistryContextType = {
  frameRegistry: FrameRegistry;
};

const FrameRegistryContext: Context<FrameRegistryContextType | undefined> = createContext<
  FrameRegistryContextType | undefined
>(undefined);

export const FrameRegistryContextProvider: FC<{ children: ReactNode; frameDefs?: FrameDef<any>[] }> = ({
  children,
  frameDefs = [],
}) => {
  return (
    <FrameRegistryContext.Provider
      value={{
        frameRegistry: new FrameRegistry(frameDefs),
      }}
    >
      {children}
    </FrameRegistryContext.Provider>
  );
};

export const useFrameRegistry = () => {
  const { frameRegistry } = useContext(FrameRegistryContext) ?? raise(new Error('Missing FrameRegistryContext.'));
  return frameRegistry;
};

//
// Frame container.
//

export type FrameState = {
  space?: Space;
  frame?: FrameDef<any>;
  objectId?: string;

  // TODO(burdon): Generalize.
  fullscreen?: boolean;
};

export type FrameContextType = FrameState & {
  // TODO(burdon): Event handler/reducer (e.g., fullscreen).
  onStateChange?: (state: FrameState) => void;

  // TODO(burdon): Generalize.
  fullscreen?: boolean;
};

const FrameContext: Context<FrameContextType | undefined> = createContext<FrameContextType | undefined>(undefined);

export const FrameContextProvider: FC<{ children: ReactNode; state: FrameContextType }> = ({ children, state }) => {
  return <FrameContext.Provider value={state}>{children}</FrameContext.Provider>;
};

export const useFrameContext = (): FrameContextType => {
  const context = useContext(FrameContext) ?? raise(new Error('Missing FrameContext.'));
  return context!;
};

// TODO(burdon): Intent emitter.
export const useFrameRouter = () => {
  const { onStateChange } = useContext(FrameContext)!;
  return (state: FrameState) => {
    if (!onStateChange) {
      console.log(state);
    } else {
      return onStateChange(state);
    }
  };
};
