//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import { type Context as ReactContext, createContext } from 'react';
import { type Step as BaseStep } from 'react-joyride';

import { type CapabilityManager } from '@dxos/app-framework';

/** A {@link react-joyride} Step plus an optional `before` hook fired right before the step renders. */
export type Step = BaseStep & {
  before?: (capabilities: CapabilityManager.CapabilityManager) => void;
};

/** Shape of the React context exposed to consumers of the welcome tour. */
export type ContextType = {
  running: boolean;
  steps: Step[];
  setSteps: (steps: Step[]) => void;
  setIndex: (index: number) => void;
  start: () => void;
  stop: () => void;
};

/** React context provided by `WelcomeTour`; access via the `useTour` hook. */
export const Context: ReactContext<ContextType> = createContext<ContextType>({
  running: false,
  steps: [],
  setSteps: () => {},
  setIndex: () => {},
  start: () => {},
  stop: () => {},
});
