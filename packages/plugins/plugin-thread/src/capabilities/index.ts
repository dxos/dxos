//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { SpaceCapability } from '@dxos/plugin-space';

import { ThreadCapabilities, ThreadEvents } from '#types';

// The graph builder reads the call manager OPTIONALLY (reactive atom with an absence guard),
// so no spec-level require: a hard cross-plugin require would fail this plugin whenever
// plugin-calls is disabled. Cross-feature requires are only valid with a plugin-level dependsOn.
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ThreadEvents.Start,
});
export const ChannelBackendFeed = Capability.lazyModule(
  'ChannelBackendFeed',
  { provides: [ThreadCapabilities.ChannelBackend], activatesOn: ThreadEvents.Start },
  () => import('./channel-backend-feed'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ThreadEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
