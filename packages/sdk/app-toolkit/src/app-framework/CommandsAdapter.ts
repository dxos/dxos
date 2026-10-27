//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability$ from '@dxos/app-framework/Capability';

/**
 * Adapts a module whose default export is a command list into a module body contributing it.
 * Default export: a manifest loads adapters by URL, like module bodies.
 */
export default ({ default: commands }: { default: ReadonlyArray<Capabilities.AnyCommand> }) => ({
  default: () => Effect.succeed([Capability$.contributeAll(Capabilities.Command, commands)]),
});
