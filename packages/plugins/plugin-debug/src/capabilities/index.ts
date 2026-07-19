//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';

import { DebugCapabilities, type DebugPluginOptions } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  requires: [Capabilities.AtomRegistry, DebugCapabilities.Settings, AppCapabilities.FileUploader],
  props: ({ logStore }: DebugPluginOptions) => ({ logStore }),
});
export const DebugSettings = AppCapability.settings(() => import('./settings'), {
  provides: [DebugCapabilities.Settings],
});
export const StatsPanel = Capability.lazyModule(
  'StatsPanel',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.StatsPanel],
    props: ({ persistStats }: DebugPluginOptions) => ({ persist: persistStats ?? true }),
  },
  () => import('./stats-panel'),
);
