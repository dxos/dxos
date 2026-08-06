//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Outline, Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';

import * as Journal from './types/Journal';

// Declared here rather than imported from `#capabilities`: that barrel pulls the React surface
// into worker bundles.
const OperationHandler = AppCapability.operationHandler(() => import('./capabilities/operation-handler'));

export const TasksPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(
    AppCapability.schema([Journal.JournalEntry, Journal.Journal, Outline.Outline, Task.Task, TaskSet.TaskSet]),
  ),
  Plugin.make,
);

export default TasksPlugin;
