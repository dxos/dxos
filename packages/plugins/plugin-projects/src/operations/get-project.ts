//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, type Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { ProjectMcpOperation } from '#types';

/**
 * The detail read behind `projectList`: goals, per-task-set open/total counts, the checklist
 * markdown, and the artifact inventory — everything an external agent needs to orient in one call.
 */
const handler: Operation.WithHandler<typeof ProjectMcpOperation.GetProject> = ProjectMcpOperation.GetProject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project: projectRef }) {
      const project = yield* Database.load(projectRef);

      const taskSets = [];
      for (const ref of project.taskSets ?? []) {
        const taskSet = yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined));
        if (!taskSet) {
          continue;
        }
        // Membership is the parent edge, so counts come from the children query.
        const children = yield* Database.query(Query.select(Filter.id(taskSet.id)).children()).run.pipe(
          Effect.orElseSucceed(() => []),
        );
        const tasks = children.filter((child): child is Task.Task => Obj.instanceOf(Task.Task, child));
        taskSets.push({
          id: taskSet.id,
          name: taskSet.name,
          openCount: tasks.filter((task) => (task.status ?? 'todo') !== 'done').length,
          totalCount: tasks.length,
        });
      }

      const outline = project.outline
        ? yield* Database.load(project.outline).pipe(Effect.orElseSucceed(() => undefined))
        : undefined;
      const outlineText = outline
        ? yield* Database.load(outline.content).pipe(Effect.orElseSucceed(() => undefined))
        : undefined;

      const artifactsCollection = project.artifacts
        ? yield* Database.load(project.artifacts).pipe(Effect.orElseSucceed(() => undefined))
        : undefined;
      const artifacts = [];
      for (const ref of (artifactsCollection?.objects ?? []) as ReadonlyArray<Ref.Ref<Obj.Unknown>>) {
        const object = yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined));
        if (object) {
          artifacts.push({ id: object.id, typename: Obj.getTypename(object) ?? '' });
        }
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        goals: [...(project.goals ?? [])],
        taskSets,
        outline: outline && outlineText ? { id: outline.id, content: outlineText.content } : undefined,
        artifacts,
      };
    }),
  ),
);

export default handler;
