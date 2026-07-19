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
import type { OperationInvoker } from '@dxos/operation';

import { ClientCapabilities, type ClientPluginOptions } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
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
export const NavigationHandler = Capability.lazyModule(
  'NavigationHandler',
  {
    requires: [Capabilities.OperationInvoker],
    provides: [AppCapabilities.NavigationHandler],
    props: ({ invitationProp }: ClientPluginOptions) => ({ invitationProp }),
  },
  () => import('./navigation-handler/navigation-handler'),
);
export type { NavigationHandlerOptions } from './navigation-handler';
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const SchemaDefs = Capability.lazyModule(
  'SchemaDefs',
  { requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, AppCapabilities.Schema], provides: [] },
  () => import('./schema-defs'),
);
