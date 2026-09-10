//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';

import { type DocsResult } from './docs';
import { type TasksResult } from './tasks';

export type ProjectInput = { docs: DocsResult; tasks: TasksResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

const INSTRUCTIONS = `You are writing the retrospective for incident 0516, when the public API was down for just over \
three hours on a Saturday morning.

The status log is the record of what happened and when. The notes are what people remember, and \
memory disagrees with the log in places. Where they disagree, the log wins, and the retrospective \
says so rather than quietly picking one. A claim that appears in a note but nowhere in the log is a \
claim, not a finding.

Keep it blameless. Name the systems and the gaps, not the people at fault; the people in the notes \
are the ones who will fix it.

File every document you write as an artifact on this project rather than leaving it in the chat, and \
turn every recommendation into a task on this project with an owner drawn from the people in the notes.`;

/** The retro as a project: the record and the notes as its artifacts, the four steps as its tasks. */
export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = SampleSpace.phase('project', {
  schemas: [Project.Project, Instructions.Instructions],
  run: ({ docs, tasks }: ProjectInput) =>
    Effect.gen(function* () {
      const sources = [docs.log, docs.notes.jae, docs.notes.priya, docs.notes.dan, docs.notes.sam];
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Incident 0516 retrospective',
          description: 'Bindings for a chat working this retro.',
          text: INSTRUCTIONS,
          objects: [...sources.map((doc) => Ref.make(doc)), Ref.make(tasks.taskSet)],
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Incident 0516 retrospective',
          description:
            'The API certificate expired on a Saturday morning and nobody was paged for two and a half hours. Work out why, and what to change.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(tasks.taskSet),
          artifacts: sources.map((doc) => Ref.make(doc)),
        }),
      );

      return { project, instructions };
    }),
});
