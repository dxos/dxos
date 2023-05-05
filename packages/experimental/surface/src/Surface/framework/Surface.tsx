//
// Copyright 2023 DXOS.org
//

import React, { createContext, ReactNode } from 'react';

import { Plugin } from './Plugin';

type SurfaceContextType = {};

const SurfaceContext = createContext<SurfaceContextType | undefined>(undefined);

export type SurfaceProps = {
  id: string; // TODO(burdon): Hierarchical.
  plugins?: Plugin[];
  element?: ReactNode;
};

export const Surface = ({ id, element }: SurfaceProps) => {
  return <SurfaceContext.Provider value={{}}>{element}</SurfaceContext.Provider>;
};
