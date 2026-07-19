//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';

import { SpotlightCapabilities } from '#types';

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'));
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
