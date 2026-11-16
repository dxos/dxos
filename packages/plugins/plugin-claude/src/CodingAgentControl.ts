//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';

import type * as HostProcessControl from '@dxos/edge-compute/host-process-control';

/**
 * EDGE's coding-agent process control, as compute-service serves it to this plugin's operations (bound to the
 * invocation's space). The key is also the host service's, so the adapter replaces the generic proxy under it.
 */
export const KEY = '@dxos/plugin-claude/CodingAgentControl';

export class CodingAgentControl extends Context.Service<CodingAgentControl, HostProcessControl.Control>()(KEY) {}
