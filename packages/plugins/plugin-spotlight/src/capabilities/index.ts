//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
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
  {
    // App-shell state — same reason as the deck's `DeckState`: `SpotlightLayout` reads it on its
    // first render, so the shell cannot paint until this module has run.
    activatesOn: ActivationEvents.Startup,
    provides: [SpotlightCapabilities.State, AppCapabilities.Layout],
  },
  () => import('./state'),
);
