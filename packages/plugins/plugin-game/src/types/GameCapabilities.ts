//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import type { GameVariant } from './types';

/**
 * A game variant contribution. Each variant plugin (chess, tic-tac-toe, ...)
 * contributes one of these via `Capability.provide(GameCapabilities.VariantProvider, variant)`.
 * Multi capability: more than one variant plugin provides it. Consumers iterate via
 * `Capability.getAll(GameCapabilities.VariantProvider)` (Effect) or
 * `useCapabilities(GameCapabilities.VariantProvider)` (React).
 */
export const VariantProvider = Capability.makeMulti<GameVariant>(`${meta.profile.key}.capability.variant`);
