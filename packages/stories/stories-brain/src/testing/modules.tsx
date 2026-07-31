//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

import { moduleSurfaces } from '../modules';

/** Contributes the brain story module surfaces so a story can drive them from a `ModuleContainer` layout. */
export const StoryModulesPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.brain.story.modules'), name: 'Facts Story Modules' }),
).pipe(
  Plugin.addModule({
    id: 'brain-story-modules',
    provides: [Capabilities.ReactSurface],
    activate: () => Effect.succeed([Capability.contribute(Capabilities.ReactSurface, moduleSurfaces)]),
  }),
  Plugin.make,
);
