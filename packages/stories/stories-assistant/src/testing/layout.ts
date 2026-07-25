//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type ModuleLayout } from '@dxos/story-modules';

/**
 * Writable atom holding the story layout produced by `onInit`. The harness writes it after the
 * space + objects exist; the wrapper `ModuleContainer` reads it and passes it to the generic
 * container. Separate from `StorybookCapabilities.LayoutState` (workspace/deck state).
 */
export namespace StoryLayout {
  export const Atom = Capability.make<Atom.Writable<ModuleLayout | undefined>>('com.example.story.layout');
}
