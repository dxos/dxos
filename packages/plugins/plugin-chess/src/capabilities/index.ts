//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AppCapabilities } from '@dxos/app-toolkit';
import type { OperationHandlerSet } from '@dxos/compute';

// The contributed capability type references Blueprint types from @dxos/compute, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const BlueprintDefinition: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
> = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const GameVariant = Capability.lazy('GameVariant', () => import('./game-variant'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
