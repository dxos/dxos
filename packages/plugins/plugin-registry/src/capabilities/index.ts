//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
import type { PluginManager } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import type { OperationHandlerSet } from '@dxos/compute';

import { RegistryCapabilities } from '../types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const DevPluginLoader = Capability.lazyModule(
  'DevPluginLoader',
  { requires: [Capabilities.PluginManager, Capabilities.AtomRegistry, RegistryCapabilities.Settings], provides: [] },
  () => import('./dev-plugin-loader'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const RegistrySettings = Capability.lazyModule(
  'RegistrySettings',
  { provides: [RegistryCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
