//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from './Operation';

// TODO(wittjosiah): Currently just Operation. Widen to a union (Operation | ComputeGraph | …) once the
// dispatcher/EDGE can run non-Operation runnables as a Process; factor down here from plugin-routine once
// ComputeGraph's type moves to @dxos/compute.
export type Runnable = Operation.PersistentOperation;
export const Runnable = Operation.PersistentOperation;
