//
// Copyright 2026 DXOS.org
//

import type * as Process from '@dxos/compute/Process';

import { makeProcessSnapshot } from '../process-snapshot.ts';

/**
 * A process known only from its data, for fixtures and stories; its live members throw.
 */
export const makeTestProcess = (data: Process.Data): Process.Process => makeProcessSnapshot(data);
