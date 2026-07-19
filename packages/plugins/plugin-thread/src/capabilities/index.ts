//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapability } from '@dxos/plugin-space';

import { ThreadCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [CallsCapabilities.Manager],
});
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
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
