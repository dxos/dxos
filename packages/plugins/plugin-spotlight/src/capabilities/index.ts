//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { SpotlightCapabilities } from '#types';

// Also gated on the foreign namespace's demand event: layout operations are defined under the shared layout namespace,
// so the handler-set resolver's targeted pull reaches this module without a fallback flood.
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvent.oneOf(
    ActivationEvents.OwnOperationHandlersRequested,
    ActivationEvents.OperationHandlersRequested('org.dxos.plugin.layout'),
  ),
});
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
