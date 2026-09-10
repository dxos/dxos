//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import type { TourStepPlacement } from '@dxos/react-ui';

/** One stop of the welcome tour: a target on the page, what to say beside it, and a hook run before it shows. */
export type Step = {
  /** Defaults to the step's one-based position. */
  id?: string;
  /** A selector, or a function resolving the element; the tour waits for it to appear. */
  target: string | (() => HTMLElement | null);
  title: string;
  description: string;
  placement?: TourStepPlacement;
  /** Runs before the step shows and may bring the target into being (open a sidebar); awaited. */
  before?: (capabilities: CapabilityManager.CapabilityManager) => void | Promise<void>;
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
