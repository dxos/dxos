//
// Copyright 2025 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';
import { SpaceCapability } from '@dxos/plugin-space';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
