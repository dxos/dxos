//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin, AppActivationEvents } from '@dxos/app-toolkit';
import { Operation, Trace, Trigger } from '@dxos/compute';

import { OperationHandler, Templates } from '#capabilities';
import { meta } from '#meta';
import { Automation } from '#types';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Automation.Automation, Operation.PersistentOperation, Trigger.Trigger, Trace.Message],
  }),
  // CreateAutomation (in OperationHandler) resolves AutomationCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addModule({ id: 'automation-templates', activatesOn: AppActivationEvents.SetupSchema, activate: Templates }),
  Plugin.make,
);

export default AutomationPlugin;
