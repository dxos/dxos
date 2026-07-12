//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import type * as ImageGeneration from './ImageGeneration';

/**
 * Plugins contribute image-generation providers via this capability (e.g. plugin-ideogram). The
 * `generateImage` operation resolves all contributions and uses the first (or the one matching the
 * requested provider id).
 */
export const ImageGenerationService = Capability.make<ImageGeneration.ImageGenerationService>(
  `${meta.profile.key}.capability.image-generation-service`,
);
