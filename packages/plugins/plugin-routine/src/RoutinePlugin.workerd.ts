//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Operation, Trace, Trigger } from '@dxos/compute';

import { OperationHandler, Templates } from '#capabilities';
import { meta } from '#meta';
import { Routine } from '#types';

export const RoutinePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(
    AppCapability.schema([Routine.Routine, Operation.PersistentOperation, Trigger.Trigger, Trace.Message]),
  ),
  // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addLazyModule(Templates),
  Plugin.make,
);

export default RoutinePlugin;
