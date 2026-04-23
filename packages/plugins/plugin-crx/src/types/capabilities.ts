//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import * as Settings from './Settings';

export namespace CrxCapabilities {
  /**
   * Writable atom holding the plugin's Settings. Other plugins (e.g.
   * `@dxos/plugin-crx-bridge`) consume this to decide whether to materialize
   * an incoming clip and how to surface it.
   */
  export const Settings = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.id}.capability.settings`);
}
