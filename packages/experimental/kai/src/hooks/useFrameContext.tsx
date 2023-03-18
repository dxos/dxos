//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { FrameDef } from '../registry';

export type FrameContextType = {
  frameDef: FrameDef<any>;
};

export const FrameContext: Context<FrameContextType | undefined> = createContext<FrameContextType | undefined>(
  undefined
);

export const useFrameContext = (): FrameContextType => {
  const context = useContext(FrameContext);
  return context!;
};
