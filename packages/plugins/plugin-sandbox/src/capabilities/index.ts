//
// Copyright 2026 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
