//
// Copyright 2026 DXOS.org
//

import * as Agent from '@dxos/compute/Agent';
import * as Project from '@dxos/compute/Project';
import { type Database, Obj, Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { LAUNCH_TASKS } from '../scripts/launch-kit.ts';

/**
 * The project the launch kit is for, seeded with its four tasks, which the agent's checklist then holds. Borrowed rather
 * than owned, so each task stays in the project's set while the agent works it.
 */
export const seedLaunchProject = async ({ db, chat }: { db: Database.Database; chat: Agent.Session }) => {
  const project = db.add(Project.make({ name: 'Composer 1.0 launch' }));
  const taskSet = db.add(TaskSet.make({ [Obj.Parent]: project }));
  Obj.update(project, (project) => {
    project.taskSet = Ref.make(taskSet);
  });
  const tasks = LAUNCH_TASKS.map(({ title }) => db.add(Task.make({ title, status: 'todo', [Obj.Parent]: taskSet })));
  const refs = tasks.map((task) => Ref.make(task));
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks.push(...refs);
  });
  Agent.assignTasks(chat, refs);
  Agent.linkCompanion({ session: chat, subject: project });
  await db.flush();
};

/** The plugins and types a launch-kit story needs beyond the harness: Space files the documents, Tasks renders the project's task list. */
export const launchProjectPlugins = async () => {
  const [SpacePlugin, TasksPlugin] = await Promise.all([
    import('@dxos/plugin-space/SpacePlugin'),
    import('@dxos/plugin-tasks/TasksPlugin'),
  ]);
  return {
    plugins: [SpacePlugin.make({}), TasksPlugin.make()],
    types: [Project.Project, TaskSet.TaskSet, Task.Task],
  };
};
