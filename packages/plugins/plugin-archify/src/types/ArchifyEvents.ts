//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

/** The feature's start event; start-gated modules activate here. */
export const Start = ActivationEvent.pluginStart(meta.profile.key);
