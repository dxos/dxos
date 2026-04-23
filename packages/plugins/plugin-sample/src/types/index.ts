//
// Copyright 2025 DXOS.org
//

// Types barrel export.
// ECHO types are exported as namespaces (e.g., `SampleItem.SampleItem`) so the
// namespace serves as both the type and the schema value. This is the standard DXOS pattern.

import type { Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import type * as Settings from './Settings';

export * as SampleItem from './SampleItem';
export * as Settings from './Settings';

// Plugin-specific capabilities are defined alongside the types they reference.
// This capability provides access to the settings atom from other capability modules.
export namespace SampleCapabilities {
  export const Settings = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.id}.capability.settings`);
}
