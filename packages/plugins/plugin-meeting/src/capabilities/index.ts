//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';
import { CallsCapabilities } from '@dxos/plugin-calls/types';

import { MeetingCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  {
    requires: [CallsCapabilities.Manager, MeetingCapabilities.State, Capabilities.OperationInvoker],
    provides: [AppCapabilities.AppGraphBuilder],
  },
  () => import('./app-graph-builder'),
);
export const CallExtension = Capability.lazyModule(
  'CallExtension',
  { requires: [MeetingCapabilities.State], provides: [CallsCapabilities.EventHandler] },
  () => import('./call-extension'),
);
export const MeetingSettings = Capability.lazyModule(
  'MeetingSettings',
  { provides: [MeetingCapabilities.Settings] },
  () => import('./settings'),
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
export const MeetingState = Capability.lazyModule(
  'MeetingState',
  { requires: [Capabilities.AtomRegistry], provides: [MeetingCapabilities.State] },
  () => import('./state'),
);
