//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as GameCapabilities from '@dxos/plugin-game/GameCapabilities';
import * as GameEvents from '@dxos/plugin-game/GameEvents';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const GameVariant = Capability.lazyModule(
  'GameVariant',
  { provides: [GameCapabilities.VariantProvider], activatesOn: GameEvents.Start },
  () => import('./game-variant'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
