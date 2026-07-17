//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
import type { PluginManager } from '@dxos/app-framework';
import type { Graph, GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';
import type { OperationHandlerSet } from '@dxos/compute';
import type { OperationInvoker } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';

import { SpaceCapabilities } from '#types';

import { SpaceOperationConfig } from '../operations/helpers';

export * from './app-graph-builder';
export { makeCreateObjectEntryForDatabaseType } from '../util';

export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
export const IdentityCreated = Capability.lazyModule(
  'IdentityCreated',
  { requires: [ClientCapabilities.Client], provides: [] },
  () => import('./identity-created'),
);
export { NavigationHandler } from './navigation-handler';
export type { NavigationHandlerOptions } from './navigation-handler';
export const NavigationResolver = Capability.lazyModule(
  'NavigationResolver',
  {
    requires: [ClientCapabilities.Client],
    provides: [AppCapabilities.NavigationTargetResolver, AppCapabilities.NavigationPathResolver],
  },
  () => import('./navigation-resolver'),
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
export const Repair = Capability.lazyModule(
  'Repair',
  { provides: [SpaceCapabilities.Repair] },
  () => import('./repair'),
);
export const SpaceSettings = Capability.lazyModule(
  'SpaceSettings',
  { provides: [SpaceCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
export const SpacesReady = Capability.lazyModule(
  'SpacesReady',
  {
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.AppGraph,
      Capabilities.AtomRegistry,
      AppCapabilities.Layout,
      AttentionCapabilities.Attention,
      SpaceCapabilities.State,
      SpaceCapabilities.EphemeralState,
      ClientCapabilities.Client,
    ],
    provides: [],
  },
  () => import('./spaces-ready'),
);
export const SpaceState = Capability.lazyModule(
  'SpaceState',
  {
    requires: [Capabilities.AtomRegistry, Capabilities.PluginManager],
    provides: [SpaceCapabilities.State, SpaceCapabilities.EphemeralState],
  },
  () => import('./state'),
);
export const UndoMappings = Capability.lazyModule(
  'UndoMappings',
  { provides: [Capabilities.UndoMapping, SpaceOperationConfig] },
  () => import('./undo-mappings'),
);
