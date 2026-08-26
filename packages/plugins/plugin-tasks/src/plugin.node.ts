//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';

/** Headless variant for node hosts: `#capabilities` resolves the barrel free of React surfaces. */
export const TasksPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema.node'))),
  Plugin.make,
);

export default TasksPlugin;
