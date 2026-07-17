//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import type { OperationHandlerSet } from '@dxos/compute';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
import type { CallManager } from '@dxos/plugin-calls';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { ThreadCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [CallsCapabilities.Manager], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const NavigationResolver = Capability.lazyModule(
  'NavigationResolver',
  { requires: [ClientCapabilities.Client], provides: [AppCapabilities.NavigationPathResolver] },
  () => import('./navigation-resolver'),
);
export const ChannelBackendFeed = Capability.lazyModule(
  'ChannelBackendFeed',
  { provides: [ThreadCapabilities.ChannelBackend] },
  () => import('./channel-backend-feed'),
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
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
