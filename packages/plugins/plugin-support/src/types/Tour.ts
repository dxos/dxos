//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import { type Step as BaseStep } from 'react-joyride';

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';

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
