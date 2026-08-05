//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Outline, Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { Journal } from '#types';

import OperationHandler from './capabilities/operation-handler';

export const TasksPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ id: 'operation-handler', activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Journal.JournalEntry, Journal.Journal, Outline.Outline, Task.Task, TaskSet.TaskSet],
  }),
  Plugin.make,
);

export default TasksPlugin;
