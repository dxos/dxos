//
// Copyright 2023 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';

export const Schema = AppCapability.schema([
  Routine.Routine,
  Operation.PersistentOperation,
  Instructions.Instructions,
  Trigger.Trigger,
  Trace.Message,
]);
