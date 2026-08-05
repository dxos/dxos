//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';

import * as DeckCapabilities from '../types/DeckCapabilities';

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
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'), {
  // The root and `DeckLayout` read all three through the strict `useAtomCapability` hooks on their
  // FIRST render, so `DeckState` (ungated, hence idle) has to be pulled onto the startup pass here
  // rather than incidentally via `UrlHandler`'s requires.
  requires: [DeckCapabilities.State, DeckCapabilities.EphemeralState, AppCapabilities.Layout],
});
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
    // Boot-time URL restore: this installs the popstate listener and the URL<->state sync, so an
    // idle registration leaves a deep link unhandled for the window it takes to get there.
    activatesOn: ActivationEvents.Startup,
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.NavigationHandler,
      AppCapabilities.NavigationTargetLoader,
      Capabilities.AtomRegistry,
      DeckCapabilities.State,
      DeckCapabilities.Settings,
      AppCapabilities.AppGraph,
      AttentionCapabilities.ViewState,
      AttentionCapabilities.Attention,
    ],
    provides: [],
  },
  () => import('./url-handler'),
);
