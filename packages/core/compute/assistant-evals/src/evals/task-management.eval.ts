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

import { findObject, toolInvocations } from '../assertions';
import { createEvalRunner } from '../runner';
import { getDefaultSkills } from '../skills';

const PROJECT_NAME = 'Beacon';
const MILESTONE_NAME = 'Preview';
const TARGET_DATE = '2026-09-30';
const ASSIGNEE_EMAIL = 'kai@example.com';

const COMPLETE_KEYWORD = 'retry';
const ASSIGN_KEYWORD = 'rollout';
const TASK_TITLES = ['Ship the beacon', 'Tune the retry budget', 'Document the rollout'];

const REQUIRED_TOOLS = ['space-query-objects', 'tasks-update', 'space-update-object'];

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
  dbQuery: () =>
    Effect.gen(function* () {
      const invocations = yield* toolInvocations();
      const called = new Set(invocations.map((invocation) => invocation.name));
      const trace = {
        missingTools: REQUIRED_TOOLS.filter((name) => !called.has(name)),
        erroredTools: invocations.filter((invocation) => invocation.error).map((invocation) => invocation.name),
      };
      const empty = { ...trace, completed: false, assigned: false, milestoneDated: false, untouched: 0 };

      const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
      const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
      if (!taskSet) {
        return empty;
      }

      const tasks = yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
      const byKeyword = (keyword: string) =>
        tasks.find((candidate) => candidate.title?.toLowerCase().includes(keyword));

      const milestone = yield* findObject(Milestone.Milestone, (candidate) => candidate.name === MILESTONE_NAME);

      return {
        ...trace,
        completed: byKeyword(COMPLETE_KEYWORD)?.status === 'done',
        assigned: byKeyword(ASSIGN_KEYWORD)?.assignee?.email === ASSIGNEE_EMAIL,
        milestoneDated: milestone?.targetDate === TARGET_DATE,
        untouched: tasks.filter((candidate) => (candidate.status ?? 'todo') !== 'done').length,
      };
    }),
});

evalite('Task management — the ledger verbs survive losing their type-specific sugar', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'task-completed',
      description: 'The retry task is done, reached through `tasks-update` rather than `tasks-complete`.',
      scorer: ({ output }) => (output.dbQuery.completed ? 1 : 0),
    },
    {
      name: 'task-assigned',
      description: 'The rollout task carries the assignee, reached through `tasks-update`.',
      scorer: ({ output }) => (output.dbQuery.assigned ? 1 : 0),
    },
    {
      name: 'milestone-dated',
      description: 'The milestone target date is set through the generic `space-update-object`.',
      scorer: ({ output }) => (output.dbQuery.milestoneDated ? 1 : 0),
    },
    {
      name: 'left-the-rest-alone',
      description: 'Exactly two tasks remain open — the agent closed one task, not the ledger.',
      scorer: ({ output }) => (output.dbQuery.untouched === 2 ? 1 : 0),
    },
    {
      name: 'generic-verbs-reached',
      description: 'Discovery and both patches went through the generic verbs, and none errored.',
      scorer: ({ output }) =>
        output.dbQuery.missingTools.length === 0 && output.dbQuery.erroredTools.length === 0 ? 1 : 0,
    },
  ],
});
