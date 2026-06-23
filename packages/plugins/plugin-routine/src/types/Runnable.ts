//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Operation } from '@dxos/compute';

// TODO(wittjosiah): Currently just Operation. Widen to a union (Operation | ComputeGraph | …) once the
// dispatcher/EDGE can run non-Operation runnables as a Process; factor down to @dxos/compute once
// ComputeGraph's type moves there. Routines are NOT a direct member — they run via the RunInstructions
// operation (bound as input).
export type Runnable = Operation.PersistentOperation;
export const Runnable = Operation.PersistentOperation;
