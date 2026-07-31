//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import type { DrawingVariant } from './types';

/**
 * A drawing variant contribution. Each renderer plugin (tldraw, excalidraw, ...) contributes one
 * via `Capability.contribute(IllustratorCapabilities.VariantProvider, variant)`.
 * Consumers iterate via `Capability.getAll(IllustratorCapabilities.VariantProvider)` (Effect) or
 * `useCapabilities(IllustratorCapabilities.VariantProvider)` (React).
 */
export const VariantProvider = Capability.make<DrawingVariant>()(`${meta.profile.key}.capability.variant`);
