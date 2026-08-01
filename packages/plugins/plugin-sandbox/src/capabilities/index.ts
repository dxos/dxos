//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { SandboxEvents } from '#types';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: SandboxEvents.Start,
});
