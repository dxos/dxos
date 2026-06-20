//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import type { GameVariant } from './types';

/**
 * A game variant contribution. Each variant plugin (chess, tic-tac-toe, ...)
 * contributes one of these via `Capability.contributes(GameCapabilities.VariantProvider, variant)`.
 * Consumers iterate via `Capability.getAll(GameCapabilities.VariantProvider)` (Effect) or
 * `useCapabilities(GameCapabilities.VariantProvider)` (React).
 */
export const VariantProvider = Capability.make<GameVariant>(`${meta.profile.key}.capability.variant`);
