//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import { Repo } from '@dxos/types';

import { type DocsResult } from './docs.ts';
import { type TasksResult } from './tasks.ts';

//
// The repository and the project that ties everything else together.
//

export type ProjectInput = { docs: DocsResult; tasks: TasksResult };

export type ProjectResult = { project: Project.Project; repo: Repo.Repo };

/**
 * The work-stream itself: it names the repository the work lands in, adopts the task set, and holds
 * the written artifacts in order. `Project.make` would create its own empty task set, so the one
 * built by the tasks phase is passed in explicitly.
 */
export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = SampleSpace.phase('project', {
  schemas: [Project.Project, Repo.Repo],
  run: ({ docs, tasks }: ProjectInput) =>
    Effect.gen(function* () {
      const repo = yield* Database.add(
        Repo.make({
          name: 'tidepool',
          owner: 'tidepool',
          url: 'https://github.com/tidepool/tidepool',
          description: 'Offline-first notes for field research.',
          defaultBranch: 'main',
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Offline sync v2',
          description:
            'Make two field devices editing the same note converge without a manual step, in time for the Northwind survey.',
          status: 'active',
          repo: Ref.make(repo),
          taskSet: Ref.make(tasks.taskSet),
          outline: Ref.make(docs.outline),
          artifacts: [Ref.make(docs.spec), Ref.make(docs.architecture), Ref.make(docs.decisions)],
        }),
      );

      return { project, repo };
    }),
});
