//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { LayerSpec, OperationHandlerSet } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Progress } from '@dxos/progress';

import { ClientCapabilities } from '#types';

export const AccountCache = Capability.lazyModule(
  'AccountCache',
  { provides: [ClientCapabilities.AccountCache] },
  () => import('./account-cache'),
);
export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const HubHttpClient = Capability.lazyModule(
  'HubHttpClient',
  { requires: [ClientCapabilities.Client], provides: [ClientCapabilities.HubHttpClient] },
  () => import('./hub-http-client'),
);
export const Client = Capability.lazyModule(
  'Client',
  { provides: [ClientCapabilities.Client, Capabilities.Layer] },
  () => import('./client'),
);
export const LayerSpecs = Capability.lazyModule(
  'LayerSpecs',
  { provides: [Capabilities.LayerSpec] },
  () => import('./layer-specs'),
);
export const Migrations = Capability.lazyModule(
  'Migrations',
  { requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, ClientCapabilities.Migration], provides: [] },
  () => import('./migrations'),
);
export { NavigationHandler } from './navigation-handler';
export type { NavigationHandlerOptions } from './navigation-handler';
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactContext = Capability.lazyModule(
  'ReactContext',
  { provides: [Capabilities.ReactContext] },
  () => import('./react-context'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const SchemaDefs = Capability.lazyModule(
  'SchemaDefs',
  { requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, AppCapabilities.Schema], provides: [] },
  () => import('./schema-defs'),
);
export const SpaceReplicationProgress = Capability.lazyModule(
  'SpaceReplicationProgress',
  {
    requires: [ClientCapabilities.Client, AppCapabilities.ProgressRegistry, Capabilities.ProcessManagerRuntime],
    provides: [],
  },
  () => import('./space-replication-progress'),
);
