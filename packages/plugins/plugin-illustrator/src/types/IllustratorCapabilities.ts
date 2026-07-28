//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import type { SketchVariant } from './types';

/**
 * A sketch variant contribution. Each renderer plugin (tldraw, excalidraw, ...)
 * contributes one of these via `Capability.contributes(IllustratorCapabilities.VariantProvider, variant)`.
 * Consumers iterate via `Capability.getAll(IllustratorCapabilities.VariantProvider)` (Effect) or
 * `useCapabilities(IllustratorCapabilities.VariantProvider)` (React).
 */
export const VariantProvider = Capability.make<SketchVariant>(`${meta.profile.key}.capability.variant`);
