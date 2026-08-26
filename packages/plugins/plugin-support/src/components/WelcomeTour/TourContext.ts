//
// Copyright 2023 DXOS.org
//

import { type Context as ReactContext, createContext } from 'react';

import { type Tour } from '#types';

// Lives with the component rather than under `types/`: `createContext` is a real React import, and
// `types/` is reachable from the node capability barrel, so a context declared there pulls React
// into a headless bundle. The `Tour` types stay in `types/` — they erase.
export const TourContext: ReactContext<Tour.ContextType> = createContext<Tour.ContextType>({
  running: false,
  steps: [],
  setSteps: () => {},
  setIndex: () => {},
  start: () => {},
  stop: () => {},
});
