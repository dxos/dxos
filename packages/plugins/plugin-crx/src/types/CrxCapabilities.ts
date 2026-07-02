//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

/**
 * Writable atom holding the plugin's Settings.
 */
export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(
  `${meta.profile.key}.capability.settings`,
);

/**
 * Page actions contributed by plugins for the browser extension to surface.
 * Contributions are arrays; consumers flatten via `getAll`.
 */
export const PageAction = Capability.make<import('./PageAction').PageAction[]>(
  `${meta.profile.key}.capability.page-action`,
);
