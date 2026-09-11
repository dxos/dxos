//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

export type Tour = import('./Tour.ts').Definition;

/**
 * A guided tour, contributed by whichever plugin owns what it walks through. Which tours apply is a
 * predicate over the rendered node's data, so the set is never enumerated here.
 */
export const Tour = Capability.make<Tour>()(`${meta.profile.key}.capability.tour`);

export type TourFragment = import('./Tour.ts').Fragment;

/**
 * Steps contributed into whichever tour is running, by the plugin that owns the feature they explain.
 * Separate from {@link Tour} so a plugin can add to a tour it does not own, and so a tour is offered
 * on its own steps whether or not anything has contributed.
 */
export const TourFragment = Capability.make<TourFragment>()(`${meta.profile.key}.capability.tourFragment`);
