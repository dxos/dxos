//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { ClaudeNamespace } from '../namespace.ts';

/** The feature's start event: the plugin's start-gated modules activate here. */
export const Start = ActivationEvent.pluginStart(ClaudeNamespace.key);
