//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import * as StorybookCapabilities from '../types/StorybookCapabilities';

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactContext = AppCapability.reactContext(() => import('./react-context'));
export const State = Capability.lazyModule(
  'State',
  // Shell state read by `Layout` on its first render — same class as the deck's `DeckState`.
  { activatesOn: ActivationEvents.Startup, provides: [StorybookCapabilities.LayoutState, AppCapabilities.Layout] },
  () => import('./state'),
);
