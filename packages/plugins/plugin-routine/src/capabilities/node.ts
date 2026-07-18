//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit type imports so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type LayerSpec, type OperationHandlerSet, type Skill } from '@dxos/compute';
import { ClientCapabilities } from '@dxos/plugin-client';

import { RoutineCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const LayerSpecs = Capability.lazyModule(
  'LayerSpecs',
  { provides: [Capabilities.LayerSpec, Capabilities.TraceSink] },
  () => import('./layer-specs'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const RegistrySync = Capability.lazyModule(
  'RegistrySync',
  {
    requires: [
      ClientCapabilities.Client,
      Capabilities.AtomRegistry,
      AppCapabilities.SkillDefinition,
      Capabilities.OperationHandler,
    ],
    provides: [],
  },
  () => import('./registry-sync'),
);
export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [RoutineCapabilities.Template] },
  () => import('./templates'),
);
export const TriggerRuntimeController = Capability.lazyModule(
  'TriggerRuntimeController',
  { requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime], provides: [] },
  () => import('./trigger-runtime-controller'),
);
