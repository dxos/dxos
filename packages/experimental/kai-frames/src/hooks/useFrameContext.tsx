//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { Space } from '@dxos/client';

import { FrameDef } from '../registry';

// TODO(burdon): Replace useAppRouter.

export type FrameContextType = {
  space: Space;
  frame: FrameDef<any>;
  objectId?: string;
};

export const FrameContext: Context<FrameContextType | undefined> = createContext<FrameContextType | undefined>(
  undefined
);

export const useFrameContext = (): FrameContextType => {
  const context = useContext(FrameContext)!;
  return context!;
};

// TODO(burdon): Event handler.

export const useFrameEvents = () => {};
