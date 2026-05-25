//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Blueprint, OperationHandlerSet } from '@dxos/compute';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const GameVariant = Capability.lazy('GameVariant', () => import('./game-variant'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
