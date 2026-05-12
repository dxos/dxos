//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import type { GameVariant } from './types';

/**
 * A game variant contribution. Each variant plugin (chess, tic-tac-toe, ...)
 * contributes one of these via `Capability.contributes(GameCapabilities.Variant, variant)`.
 * Consumers iterate via `Capability.getAll(GameCapabilities.Variant)` (Effect) or
 * `useCapabilities(GameCapabilities.Variant)` (React).
 */
export const Variant = Capability.make<GameVariant>(`${meta.id}.capability.variant`);
