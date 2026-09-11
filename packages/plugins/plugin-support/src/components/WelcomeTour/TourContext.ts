//
// Copyright 2023 DXOS.org
//

import { type Context as ReactContext, createContext } from 'react';

import type * as Tour from '@dxos/app-toolkit/Tour';

/** Shape of the React context exposed to consumers of the running tour. */
export type TourContextType = {
  running: boolean;
  steps: Tour.Step[];
  setSteps: (steps: Tour.Step[]) => void;
  setIndex: (index: number) => void;
  start: () => void;
  stop: () => void;
};

// Lives with the component rather than under `types/`: `createContext` is a real React import, and
// `types/` is reachable from the node capability barrel, so a context declared there pulls React
// into a headless bundle.
export const TourContext: ReactContext<TourContextType> = createContext<TourContextType>({
  running: false,
  steps: [],
  setSteps: () => {},
  setIndex: () => {},
  start: () => {},
  stop: () => {},
});
