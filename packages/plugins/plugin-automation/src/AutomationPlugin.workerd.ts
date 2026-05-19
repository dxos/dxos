//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation, Trace, Trigger } from '@dxos/compute';
import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Operation.PersistentOperation, Trigger.Trigger, Trace.Message] }),
  Plugin.make,
);

export default AutomationPlugin;
