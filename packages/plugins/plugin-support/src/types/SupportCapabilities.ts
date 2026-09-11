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

/** A guided tour, contributed by whichever plugin owns what it walks through. */
export const Tour = Capability.make<Tour>()(`${meta.profile.key}.capability.tour`);

export type TourFragment = import('./Tour.ts').Fragment;

/** Steps contributed into whichever tour is running, by the plugin that owns the feature. */
export const TourFragment = Capability.make<TourFragment>()(`${meta.profile.key}.capability.tourFragment`);
