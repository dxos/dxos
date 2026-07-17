//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { DebugCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  {
    requires: [Capabilities.AtomRegistry, DebugCapabilities.Settings, AppCapabilities.FileUploader],
    provides: [Capabilities.ReactSurface],
  },
  () => import('./react-surface'),
);
export const DebugSettings = Capability.lazyModule(
  'DebugSettings',
  { provides: [AppCapabilities.Settings, DebugCapabilities.Settings] },
  () => import('./settings'),
);
export const StatsPanel = Capability.lazyModule(
  'StatsPanel',
  { requires: [Capabilities.AtomRegistry], provides: [AppCapabilities.StatsPanel] },
  () => import('./stats-panel'),
);
