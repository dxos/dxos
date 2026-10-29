//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { DeepSeekNamespace } from './namespace.ts';

/** The feature's start event, gating this plugin's start-activated modules. */
export const Start = ActivationEvent.pluginStart(DeepSeekNamespace.key);
