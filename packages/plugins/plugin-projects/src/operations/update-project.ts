//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { ProjectMcpOperation } from '#types';

const handler: Operation.WithHandler<typeof ProjectMcpOperation.UpdateProject> = ProjectMcpOperation.UpdateProject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project: projectRef, name, status, description }) {
      const project = yield* Database.load(projectRef);
      // An empty patch must not mutate: `Obj.update` bumps meta and notifies reactive consumers
      // even when every assignment is skipped.
      if (name === undefined && status === undefined && description === undefined) {
        return { project: project };
      }

      Obj.update(project, (project) => {
        if (name !== undefined) {
          project.name = name;
        }
        if (status !== undefined) {
          project.status = status;
        }
        if (description !== undefined) {
          project.description = description;
        }
      });

      return { project: project };
    }),
  ),
);

export default handler;
