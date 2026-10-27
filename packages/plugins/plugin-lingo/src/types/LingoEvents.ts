//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { LingoNamespace } from '../namespace.ts';

/** Start-gated modules activate here, fired on demand and by the host's idle trickle. */
export const Start = ActivationEvent.pluginStart(LingoNamespace.key);
