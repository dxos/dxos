//
// Copyright 2026 DXOS.org
//

import { makeModuleSurfacesPlugin } from '@dxos/storybook-testing';

import { moduleSurfaces } from '../modules';

/** Contributes the brain story module surfaces so a story can drive them from a `ModuleContainer` layout. */
export const StoryModulesPlugin = () => makeModuleSurfacesPlugin('org.dxos.plugin.brain.story.modules', moduleSurfaces);
