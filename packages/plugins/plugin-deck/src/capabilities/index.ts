//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { DeckCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const CheckAppScheme = Capability.lazyModule(
  'CheckAppScheme',
  {
    requires: [DeckCapabilities.Settings, Capabilities.OperationInvoker, AppCapabilities.NavigationHandler],
    provides: [],
  },
  () => import('./check-app-scheme'),
);
export const NotificationTracker = Capability.lazyModule(
  'NotificationTracker',
  {
    requires: [
      Capabilities.AtomRegistry,
      DeckCapabilities.EphemeralState,
      Capabilities.ProcessMonitor,
      Capabilities.PluginManager,
      Capabilities.OperationInvoker,
      Capabilities.OperationHandler,
    ],
    provides: [],
  },
  () => import('./notification-tracker'),
);
// Also gated on the foreign namespace's demand event: layout operations are defined under the shared layout namespace,
// so the handler-set resolver's targeted pull reaches this module without a fallback flood.
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvent.oneOf(
    ActivationEvents.OwnOperationHandlersRequested,
    ActivationEvents.OperationHandlersRequested('org.dxos.plugin.layout'),
  ),
});
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const DeckSettings = AppCapability.settings(() => import('./settings'), {
  provides: [DeckCapabilities.Settings],
});
export const DeckState = Capability.lazyModule(
  'DeckState',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [DeckCapabilities.State, DeckCapabilities.EphemeralState, AppCapabilities.Layout],
  },
  () => import('./state'),
);
export const UrlHandler = Capability.lazyModule(
  'UrlHandler',
  {
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.NavigationHandler,
      AppCapabilities.NavigationTargetLoader,
      Capabilities.AtomRegistry,
      DeckCapabilities.State,
      DeckCapabilities.Settings,
      AppCapabilities.AppGraph,
      AttentionCapabilities.ViewState,
    ],
    provides: [],
  },
  () => import('./url-handler'),
);
