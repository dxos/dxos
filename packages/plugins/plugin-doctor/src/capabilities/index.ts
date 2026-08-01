//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { DoctorCapabilities, DoctorEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: DoctorEvents.Start,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const DiagnosticProviders = Capability.lazyModule(
  'DiagnosticProviders',
  { provides: [DoctorCapabilities.DiagnosticProvider], activatesOn: DoctorEvents.Start },
  () => import('./diagnostic-providers'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: DoctorEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: DoctorEvents.Start,
});
