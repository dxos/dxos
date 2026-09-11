//
// Copyright 2023 DXOS.org
//

import { type Context as ReactContext, createContext } from 'react';

import type * as Tour from '@dxos/plugin-support/Tour';

export type TourContextType = {
  running: boolean;
  steps: Tour.Step[];
  setSteps: (steps: Tour.Step[]) => void;
  setIndex: (index: number) => void;
  start: () => void;
  stop: () => void;
};

// Not under `types/`: that barrel is reachable from the node capabilities, and `createContext` would
// pull React into a headless bundle.
export const TourContext: ReactContext<TourContextType> = createContext<TourContextType>({
  running: false,
  steps: [],
  setSteps: () => {},
  setIndex: () => {},
  start: () => {},
  stop: () => {},
});
