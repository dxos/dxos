//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Ref } from '@dxos/echo';
import * as ProjectMailboxOperation from '@dxos/plugin-projects/ProjectMailboxOperation';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import { type ChannelResult } from './channel.ts';

export type ProjectInput = { channel: ChannelResult };

export type ProjectResult = { project: Project.Project; routine: Routine.Routine };

/**
 * The Community project and its triage routine: a feed trigger on the channel runs `TriageMessages` as a
 * runnable, with no agent in between. Disabled, the convention for template routines, so a new space spends
 * nothing until someone turns it on or runs it.
 */
export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput> = SampleSpace.partial('project', {
  schemas: [Project.Project, Routine.Routine, Trigger.Trigger, Outline.Outline, Task.Task, TaskSet.TaskSet, Text.Text],
  run: ({ channel }: ProjectInput) =>
    Effect.gen(function* () {
      const project = yield* Database.add(
        Project.make({
          name: 'Community',
          description: 'Questions and requests from the community Discord, triaged into replies to review and tasks.',
          status: 'active',
        }),
      );

      const runnable = Ref.fromURI(ProjectMailboxOperation.TriageMessages.meta.key);
      const trigger = Trigger.make({
        enabled: false,
        spec: Trigger.specFeed(channel.feed),
        runnable,
        input: { project: Ref.make(project), feed: Ref.make(channel.feed) },
        concurrency: 1,
      });
      const routine = yield* Database.add(
        Routine.make({
          name: 'Triage #general',
          description: 'Drafts replies to questions and files the work each new #general message asks for.',
          spec: { kind: 'runnable', runnable },
          triggers: [Ref.make(trigger)],
        }),
      );
      Project.addRoutine(project, routine);
      return { project, routine };
    }),
});
