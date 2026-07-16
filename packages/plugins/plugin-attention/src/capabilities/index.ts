//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
import type { Graph, GraphBuilder } from '@dxos/app-graph';
import type { OperationHandlerSet } from '@dxos/compute';

import { AttentionCapabilities } from '#types';

export const Keyboard = Capability.lazyModule(
  'Keyboard',
  { requires: [AppCapabilities.AppGraph, AttentionCapabilities.Attention], provides: [] },
  () => import('./keyboard'),
);
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
