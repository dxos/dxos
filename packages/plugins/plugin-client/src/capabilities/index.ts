//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';

import { ClientCapabilities } from '#types';

export const AccountCache = Capability.lazyModule(
  'AccountCache',
  { provides: [ClientCapabilities.AccountCache] },
  () => import('./account-cache'),
);
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
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
// Annotated so the emitted `.d.ts` names the capability via `typeof` instead of expanding
// compute types this package does not depend on (TS2883).
export const LayerSpecs: Capability.Module<void, readonly [], readonly [typeof Capabilities.LayerSpec]> =
  Capability.lazyModule('LayerSpecs', { provides: [Capabilities.LayerSpec] }, () => import('./layer-specs'));
export const Migrations = Capability.lazyModule(
  'Migrations',
  { requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, ClientCapabilities.Migration], provides: [] },
  () => import('./migrations'),
);
export { NavigationHandler } from './navigation-handler';
export type { NavigationHandlerOptions } from './navigation-handler';
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactContext = AppCapability.reactContext(() => import('./react-context'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const SchemaDefs = Capability.lazyModule(
  'SchemaDefs',
  { requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, AppCapabilities.Schema], provides: [] },
  () => import('./schema-defs'),
);
// Annotated so the emitted `.d.ts` names the requires via `typeof` instead of expanding
// progress types this package does not depend on (TS2883).
export const SpaceReplicationProgress: Capability.Module<
  void,
  readonly [
    typeof ClientCapabilities.Client,
    typeof AppCapabilities.ProgressRegistry,
    typeof Capabilities.ProcessManagerRuntime,
  ],
  readonly []
> = Capability.lazyModule(
  'SpaceReplicationProgress',
  {
    requires: [ClientCapabilities.Client, AppCapabilities.ProgressRegistry, Capabilities.ProcessManagerRuntime],
    provides: [],
  },
  () => import('./space-replication-progress'),
);
