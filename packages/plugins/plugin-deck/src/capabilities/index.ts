//
// Copyright 2025 DXOS.org
//

// eslint-disable-next-line unused-imports/no-unused-imports
import { Capabilities, Capability, type PluginManager } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public aliases
// instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Graph, type GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import { type OperationHandlerSet, type Process } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';

import { DeckCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
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
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const DeckSettings = Capability.lazyModule(
  'DeckSettings',
  { provides: [DeckCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
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
