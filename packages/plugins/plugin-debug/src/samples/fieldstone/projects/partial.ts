//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { Feed, Obj, Ref } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Message, Milestone, Outline, Repo, Task, TaskSet } from '@dxos/types';

import { type Provides as TeamProvides } from '../team/index.ts';
import { makeDocs } from './docs.ts';
import { makeHistory, planRuns } from './history.ts';
import { type InboxCrmLinks, makeProjects, threadSubject } from './projects.ts';
import { makeRoutines } from './routines.ts';
import { makeTasks } from './tasks.ts';

export type { InboxCrmLinks } from './projects.ts';

export type Requires = {
  readonly team: TeamProvides;
  readonly inboxCrm?: InboxCrmLinks;
};

export type Provides = {
  readonly projects: Record<'cache' | 'billing' | 'soc2' | 'offsite', Project.Project>;
  readonly taskSets: Record<'cache' | 'billing' | 'soc2' | 'offsite', TaskSet.TaskSet>;
  /** Every task by key; must include `cacheKeyCollision` (the Okapi fix) and `release18`. */
  readonly tasks: Record<string, Task.Task>;
  readonly chats: Record<string, Chat.Chat>;
  readonly artifacts: Record<
    'cacheDesign' | 'billingPlan' | 'soc2Policies' | 'offsiteAgenda' | 'releaseNotes',
    Markdown.Document
  >;
};

/** Alien Labs' projects, their tasks, and the agent runs behind them. Spec: `CONTENT.md`. */
export const Partial: SampleSpace.Partial<Provides, Requires> = SampleSpace.partial('fieldstoneProjects', {
  schemas: [
    Chat.Chat,
    Feed.Feed,
    Instructions.Instructions,
    Markdown.Document,
    Message.Message,
    Milestone.Milestone,
    Outline.Outline,
    Project.Project,
    Repo.Repo,
    Routine.Routine,
    Task.Task,
    TaskSet.TaskSet,
    Trace.Message,
    Trigger.Trigger,
  ],
  run: ({ team, inboxCrm }) =>
    Effect.gen(function* () {
      const { now } = yield* SampleSpace.Clock;
      const plan = planRuns(now.getTime());
      const artifacts = yield* makeDocs({ inboxCrm });
      const okapiIncident = inboxCrm && threadSubject(inboxCrm.threads.okapiIncident);
      const { taskSets, tasks } = yield* makeTasks({ team, timeline: plan.timeline, okapiIncident });
      for (const key of ['releaseNotesDraft', 'release18'] as const) {
        Obj.update(tasks[key], (task) => {
          task.artifacts = [Ref.make(artifacts.releaseNotes)];
        });
      }
      Obj.update(tasks.policyIndex, (task) => {
        task.artifacts = [Ref.make(artifacts.soc2Policies)];
      });
      Obj.update(tasks.agenda, (task) => {
        task.artifacts = [Ref.make(artifacts.offsiteAgenda)];
      });
      const projects = yield* makeProjects({ team, taskSets, artifacts, inboxCrm });
      yield* makeRoutines({ team, projects, inboxCrm });
      const { chats } = yield* makeHistory({ team, projects, tasks, plan });
      return { projects, taskSets, tasks, chats, artifacts };
    }),
});
