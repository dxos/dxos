//
// Copyright 2026 DXOS.org
//

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';

/** Wider than the browser list: a headless host cannot assume the routine plugin registers these. */
export default [Project.Project, Instructions.Instructions, Routine.Routine];
