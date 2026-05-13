//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

export type PresenterContextType = {
  running: boolean;
  start: () => void;
  stop: () => void;
};

export const PresenterContext: Context<PresenterContextType> = createContext<PresenterContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});

export * as PresenterCapabilities from './PresenterCapabilities';
export * as PresenterOperation from './PresenterOperation';
export * as Settings from './Settings';
