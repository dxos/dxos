//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CallsCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [CallsCapabilities.Manager], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const CallManager = Capability.lazyModule(
  'CallManager',
  { requires: [ClientCapabilities.Client, Capabilities.AtomRegistry], provides: [CallsCapabilities.Manager] },
  () => import('./call-manager'),
);
export const CallTransport = Capability.lazyModule(
  'CallTransport',
  { requires: [ClientCapabilities.Client], provides: [CallsCapabilities.CallTransportProvider] },
  () => import('./call-transport'),
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
