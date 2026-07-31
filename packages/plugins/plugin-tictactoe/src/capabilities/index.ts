//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { GameCapabilities } from '@dxos/plugin-game/types';

export const GameVariant = Capability.lazyModule(
  'GameVariant',
  { provides: [GameCapabilities.VariantProvider] },
  () => import('./game-variant'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
