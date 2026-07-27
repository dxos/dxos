//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { type ModuleLayout } from './ModuleContainer';

/**
 * Writable atom holding a story layout produced at runtime — e.g. by a harness `onInit` that binds
 * freshly-created objects into `Cell.article`/`Cell.companion` cells. {@link ModuleContainer} reads
 * it when contributed and otherwise falls back to its static `layout` prop, so contributing this
 * capability is how a harness hands a runtime-built layout to the container without a wrapper.
 */
export namespace StoryLayout {
  export const Atom = Capability.make<Atom.Writable<ModuleLayout | undefined>>('org.dxos.storybook.layout');
}
