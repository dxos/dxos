//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';
import { type Step as BaseStep } from 'react-joyride';

import { type CapabilityManager } from '@dxos/app-framework';

export type Step = BaseStep & {
  before?: (capabilities: CapabilityManager.CapabilityManager) => void;
};

export type HelpContextType = {
  running: boolean;
  steps: Step[];
  setSteps: (steps: Step[]) => void;
  setIndex: (index: number) => void;
  start: () => void;
  stop: () => void;
};

export const HelpContext: Context<HelpContextType> = createContext<HelpContextType>({
  running: false,
  steps: [],
  setSteps: () => {},
  setIndex: () => {},
  start: () => {},
  stop: () => {},
});
