//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'), {
  environments: ['browser', 'node', 'tauri'],
});

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
  environments: ['browser', 'node', 'tauri'],
});
