//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Ref } from '@dxos/echo';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

import { findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';

const PROJECT_NAME = 'Beacon';
const MILESTONE_NAME = 'Preview';
const TARGET_DATE = '2026-09-30';
const ASSIGNEE_EMAIL = 'kai@example.com';

const COMPLETE_KEYWORD = 'retry';
const ASSIGN_KEYWORD = 'rollout';
const TASK_TITLES = ['Ship the beacon', 'Tune the retry budget', 'Document the rollout'];

const REQUIRED_TOOLS = ['space-query-objects', 'tasks-update', 'space-update-object'];

/** The project's tasks, read outside the agent; empty if the ledger is gone. Read once per run. */
const ledgerTasks = Scorer.shared(
  Effect.gen(function* () {
    const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
    const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
    if (!taskSet) {
      return [] as Task.Task[];
    }
    return yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
  }),
);

const byKeyword = (tasks: readonly Task.Task[], keyword: string): Task.Task | undefined =>
  tasks.find((candidate) => candidate.title?.toLowerCase().includes(keyword));

/** The milestone the run is asked to date, or `undefined` if it never existed. */
const previewMilestone = findObject(Milestone.Milestone, (candidate) => candidate.name === MILESTONE_NAME);

const SCORERS = [
  Scorer.make({
    name: 'task-completed',
    description: 'The retry task is done, reached through `tasks-update` rather than `tasks-complete`.',
    score: ledgerTasks.pipe(Effect.map((tasks) => byKeyword(tasks, COMPLETE_KEYWORD)?.status === 'done')),
  }),
  Scorer.make({
    name: 'task-assigned',
    description: 'The rollout task carries the assignee, reached through `tasks-update`.',
    score: ledgerTasks.pipe(
      Effect.map((tasks) => byKeyword(tasks, ASSIGN_KEYWORD)?.assignee?.email === ASSIGNEE_EMAIL),
    ),
  }),
  Scorer.make({
    name: 'milestone-dated',
    description: 'The milestone target date is set through the generic `space-update-object`.',
    score: previewMilestone.pipe(Effect.map((milestone) => milestone?.targetDate === TARGET_DATE)),
  }),
  Scorer.make({
    name: 'left-the-rest-alone',
    description: 'Exactly two tasks remain open — the agent closed one task, not the ledger.',
    score: ledgerTasks.pipe(
      Effect.map((tasks) => tasks.filter((candidate) => (candidate.status ?? 'todo') !== 'done').length === 2),
    ),
  }),
  Scorer.toolCalls({
    name: 'generic-verbs-reached',
    description: 'Discovery and both patches went through the generic verbs, and none errored.',
    score: (invocations) => {
      const called = new Set(invocations.map((invocation) => invocation.name));
      return REQUIRED_TOOLS.every((name) => called.has(name)) && invocations.every(({ error }) => !error);
    },
  }),
];

const task = createEvalRunner({
  instructions: trim`
    A project called "${PROJECT_NAME}" exists in this space; its reference is not bound into this
    chat, so find it first. Then, using the project's tools:
    1. Mark the task about the retry budget done.
    2. Assign the task about documenting the rollout to ${ASSIGNEE_EMAIL}.
    3. Set the "${MILESTONE_NAME}" milestone's target date to ${TARGET_DATE}.
    Then reply with the number of tasks still open.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  skills: [...getDefaultSkills(), Ref.make(ProjectSkill.make())],
  plugins: [ProjectsPlugin.make(), TasksPlugin.make()],
  types: [Project.Project, Milestone.Milestone, Outline.Outline, Task.Task, TaskSet.TaskSet],
  timeout: 240_000,
  seed: ({ instructions }) =>
    Effect.gen(function* () {
      const milestone = yield* Database.add(Milestone.make({ name: MILESTONE_NAME }));
      const tasks = yield* Effect.forEach(TASK_TITLES, (title) => Database.add(Task.make({ title, status: 'todo' })));
      const taskSet = yield* Database.add(
        TaskSet.make({
          name: `${PROJECT_NAME} ledger`,
          tasks: tasks.map((entry) => Ref.make(entry)),
          milestones: [Ref.make(milestone)],
        }),
      );
      const project = yield* Database.add(
        Project.make({ name: PROJECT_NAME, instructions: Ref.make(instructions), taskSet: Ref.make(taskSet) }),
      );

      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(
        Chat.make({ name: `${PROJECT_NAME} Chat`, feed: Ref.make(feed), instructions: Ref.make(instructions) }),
      );
      yield* Database.flush();

      return { objects: [], chat: Ref.make(chat) };
    }),
  scored: true,
});

evalite('Task management — the ledger verbs survive losing their type-specific sugar', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
