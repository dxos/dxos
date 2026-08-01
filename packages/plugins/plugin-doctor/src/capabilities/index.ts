//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { DoctorCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const DiagnosticProviders = Capability.lazyModule(
  'DiagnosticProviders',
  { provides: [DoctorCapabilities.DiagnosticProvider], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./diagnostic-providers'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
