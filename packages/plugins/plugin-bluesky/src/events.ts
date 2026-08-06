//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

export namespace BlueskyEvents {
  /**
   * The feature's start event: the plugin's start-gated modules (and cross-plugin
   * contributions consumed by this feature) activate here. Fired on demand and by the
   * host's idle trickle.
   */
  export const Start = ActivationEvent.pluginStart(meta.profile.key);
}
