//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';

/**
 * Headless variant registered by node hosts (the CLI, agents), where rendering is unavailable.
 * The capabilities come from `#capabilities`, which resolves a server-safe barrel under the `node`
 * condition — the browser barrel declares React surfaces, and a bundler follows the dynamic import
 * behind a lazy capability, so resolving it here would drag React into a node build.
 */
export const TasksPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema.node'))),
  Plugin.make,
);

export default TasksPlugin;
