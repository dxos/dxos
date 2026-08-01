//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { GameCapabilities } from '@dxos/plugin-game/types';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const GameVariant = Capability.lazyModule(
  'GameVariant',
  { provides: [GameCapabilities.VariantProvider], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./game-variant'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
