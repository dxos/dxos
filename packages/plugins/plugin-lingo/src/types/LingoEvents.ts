//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

/** Start-gated modules activate here, fired on demand and by the host's idle trickle. */
export const Start = ActivationEvent.pluginStart(meta.profile.key);
