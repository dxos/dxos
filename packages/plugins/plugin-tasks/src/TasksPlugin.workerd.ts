//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Outline, Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { Journal } from '#types';

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
