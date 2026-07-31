//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { CallsCapabilities } from '@dxos/plugin-calls/types';

import { MeetingCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [CallsCapabilities.Manager, MeetingCapabilities.State, Capabilities.OperationInvoker],
});
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
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const MeetingState = Capability.lazyModule(
  'MeetingState',
  { requires: [Capabilities.AtomRegistry], provides: [MeetingCapabilities.State] },
  () => import('./state'),
);
