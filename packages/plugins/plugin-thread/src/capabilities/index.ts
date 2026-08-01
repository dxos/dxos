//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { SpaceCapability } from '@dxos/plugin-space';

import { ThreadCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [CallsCapabilities.Manager],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ChannelBackendFeed = Capability.lazyModule(
  'ChannelBackendFeed',
  { provides: [ThreadCapabilities.ChannelBackend], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./channel-backend-feed'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
