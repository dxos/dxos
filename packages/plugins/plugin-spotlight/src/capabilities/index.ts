//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public alias instead of a
// relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';

import { SpotlightCapabilities } from '#types';

export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactRoot = Capability.lazyModule(
  'ReactRoot',
  { provides: [Capabilities.ReactRoot] },
  () => import('./react-root'),
);
export const SpotlightDismiss = Capability.lazyModule(
  'SpotlightDismiss',
  { provides: [] },
  () => import('./spotlight-dismiss'),
);
export const State = Capability.lazyModule(
  'State',
  { provides: [SpotlightCapabilities.State, AppCapabilities.Layout] },
  () => import('./state'),
);
