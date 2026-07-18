//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public aliases
// instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Graph, type GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';

import { NavTreeCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const Keyboard = Capability.lazyModule(
  'Keyboard',
  { requires: [AppCapabilities.AppGraph, Capabilities.OperationInvoker], provides: [] },
  () => import('./keyboard'),
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
export const State = Capability.lazyModule(
  'State',
  { requires: [Capabilities.AtomRegistry, AppCapabilities.Layout], provides: [NavTreeCapabilities.State] },
  () => import('./state'),
);
