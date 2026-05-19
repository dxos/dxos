//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type { Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

// Inline imports to avoid `Settings` / `Update` namespace aliases colliding with the
// capability constants exported below.
export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(`${meta.id}.capability.settings`);
export const UpdateManager = Capability.make<import('./Update').Manager>(`${meta.id}.capability.update-manager`);
