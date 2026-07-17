//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, type PluginManager } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
import { type OperationHandlerSet } from '@dxos/compute';
import { type Observability } from '@dxos/observability';
import type { OperationInvoker } from '@dxos/operation';

import { ObservabilityCapabilities } from '#types';

export const ClientReady = Capability.lazyModule(
  'ClientReady',
  {
    requires: [
      Capabilities.PluginManager,
      Capabilities.OperationInvoker,
      ObservabilityCapabilities.ClientCapability,
      ObservabilityCapabilities.Observability,
      ObservabilityCapabilities.State,
    ],
    provides: [],
  },
  () => import('./client-ready'),
);
export const PrivacyNotice = Capability.lazyModule(
  'PrivacyNotice',
  {
    requires: [
      Capabilities.OperationInvoker,
      Capabilities.AtomRegistry,
      ObservabilityCapabilities.State,
      ObservabilityCapabilities.ClientCapability,
    ],
    provides: [],
  },
  () => import('./privacy-notice'),
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
export const ObservabilitySettings = Capability.lazyModule(
  'ObservabilitySettings',
  { provides: [ObservabilityCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
export const ObservabilityState = Capability.lazyModule(
  'ObservabilityState',
  { requires: [Capabilities.AtomRegistry], provides: [ObservabilityCapabilities.State] },
  () => import('./state'),
);
