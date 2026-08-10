//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

/**
 * The feature's start event: cross-plugin contributions consumed by this feature activate here,
 * alongside the plugin's own start-gated modules. Fired on demand and by the host's idle trickle.
 */
export const Start = ActivationEvent.pluginStart(meta.profile.key);
