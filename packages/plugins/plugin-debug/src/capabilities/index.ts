//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { DebugCapabilities, type DebugPluginOptions } from '#types';

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
    props: ({ logStore }: DebugPluginOptions) => ({ logStore }),
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
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.StatsPanel],
    props: ({ persistStats }: DebugPluginOptions) => ({ persist: persistStats ?? true }),
  },
  () => import('./stats-panel'),
);
