//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, Project } from '@dxos/compute';
import { Database, Filter } from '@dxos/echo';

import { ProjectMcpOperation } from '#types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** Summary rows only — `projectGet` is the detail read, so a list stays cheap for a model to scan. */
const handler: Operation.WithHandler<typeof ProjectMcpOperation.ListProjects> = ProjectMcpOperation.ListProjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ match, limit }) {
      const projects = yield* Database.query(Filter.type(Project.Project)).run;
      const needle = match?.toLowerCase();
      const matched = needle ? projects.filter((project) => project.name?.toLowerCase().includes(needle)) : projects;

      return {
        projects: matched.slice(0, Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)).map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          hasTaskSet: project.taskSet !== undefined,
          goalCount: project.goals?.length ?? 0,
        })),
      };
    }),
  ),
);

export default handler;
