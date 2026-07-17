//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import * as Settings from './Settings';

/**
 * Descriptor for a registered `BlobBackend` storage option, surfaced in the file plugin's
 * settings UI. Actual upload/read logic lives in the Blob backend registered on the Hypergraph
 * under `storage` (see `client.graph.registerBlobBackend`) — this type carries no behavior.
 */
export type Backend = {
  /** Display label shown in the settings UI. */
  readonly name: string;
  /** Description shown next to the backend in settings. */
  readonly description?: string;
  /**
   * `Blob.fromBytes`'s `storage` option to use when this backend is selected. Also the settings
   * key identifying this backend — one `BlobBackend` is registered per storage name, so the two
   * concepts always coincide.
   */
  readonly storage: string;
};

export const Backend = Capability.make<Backend>(`${meta.profile.key}.capability.backend`);

export const SettingsAtom = Capability.make<Atom.Writable<Settings.Settings>>(
  `${meta.profile.key}.capability.settings`,
);
