//
// Copyright 2023 DXOS.org
//

import React, { createContext, ReactNode } from 'react';

import { Plugin } from './Plugin';

type SurfaceContextType = {};

const SurfaceContext = createContext<SurfaceContextType | undefined>(undefined);

export type SurfaceProps = {
  id: string; // TODO(burdon): Hierarchical ID.
  plugins?: Plugin[];
  element?: ReactNode;
};

/**
 * A Surface is a UI portal that contains a single root component from a designated plugin.
 * Surfaces are dynamically configurable by the App based on the application state.
 * Surfaces are nested and can be used to create a hierarchy of UI components.
 */
export const Surface = ({ id, element }: SurfaceProps) => {
  return <SurfaceContext.Provider value={{}}>{element}</SurfaceContext.Provider>;
};

export const useSurface = () => {};
