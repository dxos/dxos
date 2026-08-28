//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { TaskSet } from '@dxos/types';

import { ProjectOperation } from '#types';

const handler: Operation.WithHandler<typeof ProjectOperation.GetProject> = ProjectOperation.GetProject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project: projectRef }) {
      const project = yield* Database.load(projectRef);

      const taskSet = project.taskSet
        ? yield* Database.load(project.taskSet).pipe(Effect.orElseSucceed(() => undefined))
        : undefined;
      const tasks = taskSet ? yield* TaskSet.loadTasks(taskSet) : [];

      const outline = project.outline
        ? yield* Database.load(project.outline).pipe(Effect.orElseSucceed(() => undefined))
        : undefined;
      const outlineText = outline
        ? yield* Database.load(outline.content).pipe(Effect.orElseSucceed(() => undefined))
        : undefined;

      const artifacts = [];
      for (const ref of project.artifacts) {
        const object = yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined));
        if (object) {
          artifacts.push({ id: object.id, typename: Obj.getTypename(object) ?? '' });
        }
      }

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        description: project.description,
        taskSet: taskSet
          ? {
              id: taskSet.id,
              name: taskSet.name,
              openCount: tasks.filter((task) => (task.status ?? 'todo') !== 'done').length,
              totalCount: tasks.length,
            }
          : undefined,
        outline: outline && outlineText ? { id: outline.id, content: outlineText.content } : undefined,
        artifacts,
      };
    }),
  ),
);

export default handler;
