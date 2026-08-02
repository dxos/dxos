//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity, Obj } from '@dxos/echo';

import { ProjectMcpOperation } from '#types';

const handler: Operation.WithHandler<typeof ProjectMcpOperation.UpdateProject> = ProjectMcpOperation.UpdateProject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project: projectRef, name, description, goals }) {
      const project = yield* Database.load(projectRef);
      // An empty patch must not mutate: `Obj.update` bumps meta and notifies reactive consumers
      // even when every assignment is skipped.
      if (name === undefined && description === undefined && goals === undefined) {
        return { project: Entity.toJSON(project) };
      }

      Obj.update(project, (project) => {
        if (name !== undefined) {
          project.name = name;
        }
        if (description !== undefined) {
          project.description = description;
        }
        if (goals !== undefined) {
          project.goals = [...goals];
        }
      });

      return { project: Entity.toJSON(project) };
    }),
  ),
);

export default handler;
