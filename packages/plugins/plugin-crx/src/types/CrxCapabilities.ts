//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

/**
 * Writable atom holding the plugin's Settings.
 */
export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/**
 * Page actions contributed by plugins for the browser extension to surface.
 * Multi: each contributor provides one array (e.g. plugin-bookmarks); consumers flatten via `getAll`.
 */
export const PageAction = Capability.make<import('./PageAction.ts').PageAction[]>()(
  `${meta.profile.key}.capability.pageAction`,
);
