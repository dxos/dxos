//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';

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
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
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
      Capabilities.AtomRegistry,
      DeckCapabilities.State,
      DeckCapabilities.Settings,
      AppCapabilities.AppGraph,
    ],
    provides: [],
  },
  () => import('./url-handler'),
);
