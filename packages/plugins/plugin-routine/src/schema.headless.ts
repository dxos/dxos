//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 *
 * Reduced list carried over unchanged from the former `schema.node.ts` / `schema.workerd.ts`
 * (identical to each other) — it is missing `Instructions.Instructions` relative to the full
 * canonical `./capabilities/schema.ts` list. Flagged, not fixed: this needs a human decision on
 * whether headless environments should register the full set.
 */
export default [Routine.Routine, Operation.PersistentOperation, Trigger.Trigger, Trace.Message];
