//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { OperationHandlerSet } from '@dxos/compute';
import { GameCapabilities } from '@dxos/plugin-game/types';

export const GameVariant = Capability.lazyModule(
  'GameVariant',
  { provides: [GameCapabilities.VariantProvider] },
  () => import('./game-variant'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
