//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { Space } from '@dxos/client';

import { FrameDef } from '../registry';

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
