//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { Graph, GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [AppCapabilities.AppGraph], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
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
