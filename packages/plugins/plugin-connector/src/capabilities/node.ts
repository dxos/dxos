//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { OperationHandlerSet } from '@dxos/compute';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { Connector } from '#types';

export * from './connector-coordinator';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [Connector], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const BuiltinConnectors = Capability.lazyModule(
  'BuiltinConnectors',
  { provides: [Connector] },
  () => import('./connectors'),
);
export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
