//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Trigger from '@dxos/compute/Trigger';

import { OperationHandler, Templates } from '#capabilities';
import { meta } from '#meta';

export const RoutinePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema.workerd'))),
  // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addModule(Templates),
  Plugin.make,
);

export default RoutinePlugin;
