//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public alias instead of a
// relative `node_modules` path (TS2883).
import type { OperationHandlerSet } from '@dxos/compute';

import { StorybookCapabilities } from '#types';

export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const State = Capability.lazyModule(
  'State',
  { provides: [StorybookCapabilities.LayoutState, AppCapabilities.Layout] },
  () => import('./state'),
);
