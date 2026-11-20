//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';

import type * as HostProcessControl from '@dxos/edge-compute/host-process-control';

/**
 * Control of the coding agent's process, which this plugin's operations require: on EDGE it is built from the generic
 * process control compute-service serves bundles (bound to the invocation's space).
 */
export const KEY = '@dxos/plugin-claude/CodingAgentControl';

export class CodingAgentControl extends Context.Service<CodingAgentControl, HostProcessControl.Control>()(KEY) {}
