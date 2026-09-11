//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { evalite } from 'evalite';

import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

import { findObject } from '../assertions.ts';
import { SERVER, runClaudeEval, tool } from '../claude-harness.ts';

//
// This repo's MCP surface, driven by a real Claude Code subprocess and graded by what reached the
// database.
//
// The CLI's own end-to-end test (`packages/devtools/cli/src/commands/mcp/agent-e2e.test.ts`) runs
// the same agent against `dx mcp serve`. This is its eval counterpart, and it differs in one place:
// the server runs inside the eval process against the harness's own client (see `src/mcp-host.ts`),
// so there is no CLI binary to build, no profile to bootstrap, and one database — which is what
// lets a scorer grade the write rather than the model's account of it.
//
// Only the server's tools are allowed. No Bash, no file tools: an agent that can shell out could
// satisfy a prompt without ever reaching the surface, and the run would prove nothing about it.
//

const PROJECT_NAME = 'Lighthouse';

/** Distinctive enough that a query cannot match one by accident, nor the model invent one. */
const ROTATE = 'Rotate the staging credentials';
const BACKFILL = 'Backfill the sync telemetry dashboard';

const DESCRIPTION = 'picked up by the eval agent';

type TaskRow = { title?: string; status?: string; description?: string };

/** Every task in the ledger, read outside the agent. */
const readTasks = Effect.gen(function* () {
  const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
  const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
  if (!taskSet) {
    return [] as TaskRow[];
  }
  return yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
});

const find = (tasks: readonly TaskRow[], title: string): TaskRow | undefined =>
  tasks.find((candidate) => candidate.title === title);

const task = () =>
  runClaudeEval(
    {
      skills: [{ key: ProjectSkill.key, make: ProjectSkill.make, operations: ProjectSkill.operations }],
      plugins: [ProjectsPlugin.make(), TasksPlugin.make()],
      types: [Project.Project, Milestone.Milestone, Outline.Outline, Task.Task, TaskSet.TaskSet],
      seed: () =>
        Effect.gen(function* () {
          const tasks = yield* Effect.forEach([ROTATE, BACKFILL], (title) =>
            Database.add(Task.make({ title, status: 'todo' })),
          );
          const taskSet = yield* Database.add(
            TaskSet.make({
              name: `${PROJECT_NAME} ledger`,
              tasks: tasks.map((entry) => Ref.make(entry)),
              milestones: [],
            }),
          );
          yield* Database.add(Project.make({ name: PROJECT_NAME, taskSet: Ref.make(taskSet) }));
        }),
    },
    async ({ spaceId, send, query }) => {
      // Stage 1 — the starting state, proven before a single token is spent. Without it, a later
      // "the task is done" score cannot distinguish the agent's work from a bad fixture.
      const seeded = await query(readTasks);
      const scaffolded =
        seeded.length === 2 && find(seeded, ROTATE)?.status === 'todo' && find(seeded, BACKFILL)?.status === 'todo';

      // Stage 2 — a read-only turn. It must NOT change the database: an agent that writes while
      // answering a question is a defect the write stages below would happily absorb.
      const read = await send(
        `Using only the ${SERVER} MCP server, list the tasks of the project "${PROJECT_NAME}" in space ` +
          `${spaceId}. Reply with their exact titles, one per line, and change nothing.`,
      );
      const afterRead = await query(readTasks);
      const listed =
        !read.isError &&
        read.toolCalls.some((name) => name.startsWith(`mcp__${SERVER}__`)) &&
        (read.result ?? '').includes(ROTATE) &&
        (read.result ?? '').includes(BACKFILL);
      const readOnly =
        afterRead.length === 2 &&
        find(afterRead, ROTATE)?.status === 'todo' &&
        find(afterRead, BACKFILL)?.status === 'todo';

      // Stage 3 — one write, read back between turns, so a regression here cannot be excused as
      // "it happened later".
      const complete = await send(
        `In space ${spaceId}, mark the task titled "${ROTATE}" as done. Update the existing task; do not ` +
          'create a new one. Leave every other task alone.',
      );
      const afterComplete = await query(readTasks);
      const completed =
        !complete.isError &&
        complete.toolCalls.includes(tool('invokeOperation')) &&
        find(afterComplete, ROTATE)?.status === 'done' &&
        // The untouched task is the control: it proves the write was targeted, not a blanket update.
        find(afterComplete, BACKFILL)?.status === 'todo';

      // Stage 4 — a second write on the same conversation. `started`, not "in progress", because
      // `Task.status` is a closed literal set and a value outside it would have the agent either
      // fail or invent one.
      const start = await send(
        `Now set the remaining todo task in space ${spaceId} to the "started" status and give it the ` +
          `description "${DESCRIPTION}". Update the existing task; do not create a new one.`,
      );
      const afterStart = await query(readTasks);
      const backfill = find(afterStart, BACKFILL);
      const started =
        !start.isError &&
        start.toolCalls.includes(tool('invokeOperation')) &&
        backfill?.status === 'started' &&
        (backfill?.description ?? '').includes(DESCRIPTION) &&
        // Still done: a later turn must not roll back what an earlier one committed.
        find(afterStart, ROTATE)?.status === 'done';

      return {
        scaffolded,
        listed,
        readOnly,
        completed,
        started,
        // The ledger's own length, not a filter: the natural failure of an agent that cannot find a
        // task is to create a new one and report success, which every title-keyed check would pass.
        taskCount: afterStart.length,
        turns: [read, complete, start].map(({ isError, toolCalls, result }) => ({ isError, toolCalls, result })),
      };
    },
  );

evalite('MCP server — Claude Code drives the projected surface, graded from the database', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'scaffold-visible',
      description: 'The seeded ledger is readable outside the agent before the run starts.',
      scorer: ({ output }) => (output.scaffolded ? 1 : 0),
    },
    {
      name: 'tasks-listed',
      description: 'The agent read both tasks through the server rather than answering from the prompt.',
      scorer: ({ output }) => (output.listed ? 1 : 0),
    },
    {
      name: 'read-turn-changed-nothing',
      description: 'The read-only turn left every task as it found it.',
      scorer: ({ output }) => (output.readOnly ? 1 : 0),
    },
    {
      name: 'task-completed',
      description: 'The named task is done in the database, and only that task moved.',
      scorer: ({ output }) => (output.completed ? 1 : 0),
    },
    {
      name: 'follow-up-turn-wrote',
      description: 'A second turn set the other task started with its description, without rolling the first back.',
      scorer: ({ output }) => (output.started ? 1 : 0),
    },
    {
      name: 'ledger-intact',
      description: 'Still exactly two tasks — the agent updated the ledger rather than adding to it.',
      scorer: ({ output }) => (output.taskCount === 2 ? 1 : 0),
    },
  ],
});
