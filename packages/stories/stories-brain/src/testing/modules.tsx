//
// Copyright 2026 DXOS.org
//

import * as ModuleSurfacesPlugin from '@dxos/storybook-testing/ModuleSurfacesPlugin';

import { moduleSurfaces } from '../modules/index.ts';

/** Contributes the brain story module surfaces so a story can drive them from a `ModuleContainer` layout. */
export const StoryModulesPlugin = () =>
  ModuleSurfacesPlugin.make('org.dxos.plugin.brain.story.modules', moduleSurfaces);
