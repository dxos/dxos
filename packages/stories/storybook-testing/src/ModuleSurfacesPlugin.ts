//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

/** Contributes a package's module surfaces so a story can lay them out with `ModuleContainer.Root`. */
export const make = (key: string, surfaces: Capabilities.ReactSurface) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make(key), name: 'Story Module Surfaces' })).pipe(
    Plugin.addModule({
      id: `${key}.module.surfaces`,
      provides: [Capabilities.ReactSurface],
      activate: () => Effect.succeed([Capability.contribute(Capabilities.ReactSurface, surfaces)]),
    }),
    Plugin.make,
  )();
