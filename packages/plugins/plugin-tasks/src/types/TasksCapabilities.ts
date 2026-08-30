//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Capability from '@dxos/app-framework/Capability';
import { type ObjectAction } from '@dxos/app-toolkit/ObjectAction';
import { type Task } from '@dxos/types';

import { meta } from '#meta';

/**
 * A task-scoped action injected into a task row's menu — plugin-projects contributes "delegate to a
 * chat" this way, which is what keeps plugin-tasks from importing it (the dependency runs the other
 * way).
 *
 * `createInvocations` returning an empty list means the action does not apply to that task and the
 * row omits it, so an action can be offered on some tasks and not others without a second predicate.
 */
export type TaskAction = ObjectAction<Task.Task>;

// Multi: one menu item per contributed action, and more than one plugin may contribute.
export const TaskAction = Capability.make<TaskAction>()(`${meta.profile.key}.capability.taskAction`);
