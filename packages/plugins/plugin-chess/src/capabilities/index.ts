//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const GameVariant = Capability.lazy('GameVariant', () => import('./game-variant'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
