//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { ScriptNamespace } from '../namespace.ts';

export const SetupCompiler = ActivationEvent.make(`${ScriptNamespace.key}.event.setupCompiler`);

/**
 * The feature's start event: the plugin's start-gated modules (and cross-plugin
 * contributions consumed by this feature) activate here. Fired on demand and by the
 * host's idle trickle.
 */
export const Start = ActivationEvent.pluginStart(ScriptNamespace.key);
