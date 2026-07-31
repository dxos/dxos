//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
