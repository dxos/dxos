//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

/**
 * Plugins contribute generation providers via this capability (e.g. plugin-ideogram), one per
 * kind/provider. The `generate` operation resolves all contributions and picks the one matching the
 * artifact's `kind` (and optional provider id).
 *
 * The provider type is referenced via an inline `import(...)` type so the sibling contract module
 * (imported elsewhere as the `GenerationService` namespace) does not collide with this capability's
 * `GenerationService` export.
 */
export const GenerationService = Capability.make<import('./GenerationService').GenerationService>(
  `${meta.profile.key}.capability.generation-service`,
);
