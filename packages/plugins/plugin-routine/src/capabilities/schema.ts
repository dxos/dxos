//
// Copyright 2023 DXOS.org
//

import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [
  Routine.Routine,
  Operation.PersistentOperation,
  Instructions.Instructions,
  Trigger.Trigger,
  Trace.Message,
];
