//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

/**
 * The animator's start event: stage plugins contribute their `AnimatorCapabilities.Stage` here, so a stage costs
 * nothing until an animation is open. Fired on demand and by the host's idle trickle.
 */
export const Start = ActivationEvent.pluginStart(meta.profile.key);
