//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { CallsCapabilities } from '@dxos/plugin-calls/types';

import { MeetingCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [CallsCapabilities.Manager, MeetingCapabilities.State, Capabilities.OperationInvoker],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const CallExtension = Capability.lazyModule(
  'CallExtension',
  {
    requires: [MeetingCapabilities.State],
    provides: [CallsCapabilities.EventHandler],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./call-extension'),
);
export const MeetingSettings = Capability.lazyModule(
  'MeetingSettings',
  { provides: [MeetingCapabilities.Settings], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./settings'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const MeetingState = Capability.lazyModule(
  'MeetingState',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [MeetingCapabilities.State],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./state'),
);
