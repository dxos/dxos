//
// Copyright 2023 DXOS.org
//

import { type Context as ReactContext, createContext } from 'react';

import type * as Tour from '@dxos/app-toolkit/Tour';

export type TourContextType = {
  running: boolean;
  steps: readonly Tour.Step[];
  setSteps: (steps: readonly Tour.Step[]) => void;
  setIndex: (index: number) => void;
  start: () => void;
  stop: () => void;
};

export const TourContext: ReactContext<TourContextType> = createContext<TourContextType>({
  running: false,
  steps: [],
  setSteps: () => {},
  setIndex: () => {},
  start: () => {},
  stop: () => {},
});
