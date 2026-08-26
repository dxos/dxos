//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ProjectCapabilities } from '#types';

// A bundler walks a lazy module's import, so naming `ReactSurface` or `CreateObject` — whose entry
// carries the create panel — would pull React into every node build.

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
// No `activatesOn`: `ProjectsEvents.Start` is fired by the React surfaces, which a headless host
// never activates, so gating on it would leave every project template unregistered.
export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [ProjectCapabilities.Template] },
  () => import('./templates'),
);
