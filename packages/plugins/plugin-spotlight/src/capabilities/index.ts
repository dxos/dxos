//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import * as SpotlightCapabilities from '../types/SpotlightCapabilities';

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
