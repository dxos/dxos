//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { SimpleLayoutCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
// Also gated on the foreign namespace's demand event: layout operations are defined under the shared layout namespace,
// so the handler-set resolver's targeted pull reaches this module without a fallback flood.
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvent.oneOf(
    ActivationEvents.OwnOperationHandlersRequested,
    ActivationEvents.OperationHandlersRequested('org.dxos.plugin.layout'),
  ),
});
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const SpotlightDismiss = Capability.lazyModule(
  'SpotlightDismiss',
  {
    provides: [],
    props: (options: { isPopover?: boolean }) => ({ isPopover: options.isPopover ?? false }),
  },
  () => import('./spotlight-dismiss'),
);
export const State = Capability.lazyModule(
  'State',
  {
    provides: [SimpleLayoutCapabilities.State, AppCapabilities.Layout],
    props: (options: { isPopover?: boolean }) => ({ initialState: { isPopover: options.isPopover ?? false } }),
  },
  () => import('./state'),
);
export const UrlHandler = Capability.lazyModule(
  'UrlHandler',
  {
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.NavigationHandler,
      Capabilities.AtomRegistry,
      SimpleLayoutCapabilities.State,
      AppCapabilities.AppGraph,
    ],
    provides: [],
  },
  () => import('./url-handler'),
);
