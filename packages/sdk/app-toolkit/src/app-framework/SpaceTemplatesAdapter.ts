//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capability$ from '@dxos/app-framework/Capability';

import * as AppCapabilities from './AppCapabilities.ts';

/**
 * Adapts a module whose default export is a space template list into a module body contributing it.
 * Default export: a manifest loads adapters by URL, like module bodies.
 */
export default ({ default: templates }: { default: ReadonlyArray<AppCapabilities.SpaceTemplate> }) => ({
  default: () => Effect.succeed([Capability$.contributeAll(AppCapabilities.SpaceTemplate, templates)]),
});
