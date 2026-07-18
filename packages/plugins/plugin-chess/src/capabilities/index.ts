//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { GameCapabilities } from '@dxos/plugin-game/types';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const GameVariant = Capability.lazyModule(
  'GameVariant',
  { provides: [GameCapabilities.VariantProvider] },
  () => import('./game-variant'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
