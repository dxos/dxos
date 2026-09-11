//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

import { findObject, toolInvocations } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';

/**
 * The MCP surface, graded by what reached the database.
 *
 * The CLI's own end-to-end test (`packages/devtools/cli/src/commands/mcp/agent-e2e.test.ts`) proves
 * the same surface against a real Claude Code subprocess talking to `dx mcp serve`. This is its
 * eval counterpart: the server runs inside the eval process (see `src/mcp-host.ts`), so there is no
 * CLI binary, no bootstrapped profile and no second database — the agent's writes land in the same
 * space the assertions below read, which is what lets a scorer grade the effect rather than the
 * model's own account of it.
 *
 * `skills: []` is load-bearing. With no native tools bound, the three MCP verbs are the only way to
 * reach the space at all, so a pass cannot come from the in-process toolkit the other evals use.
 *
 * KNOWN FAILURE, and not this scenario's: the run dies immediately after the session logs
 * "Connected to MCP server", with `runInstructions` failing inside effect's `Schema`
 * ("Cannot read properties of undefined (reading 'encoding')", from `ProcessHandle`'s input
 * encode). It is the act of connecting that breaks it — the same run passes when the server
 * answers nothing, fails with zero skills served, and failed identically under effect's own MCP
 * HTTP transport — which points at `McpToolkit.make` building each tool parameter from the shared
 * `Schema.Unknown` rather than at anything this eval hosts. Any assistant session that connects an
 * MCP server hits it, the `browser` skill included. `src/mcp-host.test.ts` is the part that can be
 * verified today: it drives this same server with the same client, deterministically.
 */

const PROJECT_NAME = 'Lighthouse';

/** Distinctive enough that a query cannot match one by accident, nor the model invent one. */
const ROTATE = 'Rotate the staging credentials';
const BACKFILL = 'Backfill the sync telemetry dashboard';

const DESCRIPTION = 'picked up by the eval agent';

/** The projected surface's verbs, as the MCP client names them to the model. */
const QUERY_OPERATIONS = 'queryOperations';
const INVOKE_OPERATION = 'invokeOperation';

const task = createEvalRunner({
  instructions: trim`
    A project called "${PROJECT_NAME}" exists in this space, with a task ledger. Using the MCP
    server's tools and nothing else:
    1. Mark the task titled "${ROTATE}" as done.
    2. Set the other task to the "started" status and give it the description "${DESCRIPTION}".
    Update the existing tasks; do not create new ones. Then reply with the title of each task and
    its status.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  // No native tools: every write below has to travel over the MCP transport.
  skills: [],
  mcpServer: {
    skills: [{ key: ProjectSkill.key, make: ProjectSkill.make, operations: ProjectSkill.operations }],
  },
  plugins: [ProjectsPlugin.make(), TasksPlugin.make()],
  types: [Project.Project, Milestone.Milestone, Outline.Outline, Task.Task, TaskSet.TaskSet],
  // Two writes, each preceded by discovery over three MCP round trips of its own; the package
  // default (60s) times out before the second one lands.
  timeout: 240_000,
  seed: () =>
    Effect.gen(function* () {
      const tasks = yield* Effect.forEach([ROTATE, BACKFILL], (title) =>
        Database.add(Task.make({ title, status: 'todo' })),
      );
      const taskSet = yield* Database.add(
        TaskSet.make({ name: `${PROJECT_NAME} ledger`, tasks: tasks.map((entry) => Ref.make(entry)), milestones: [] }),
      );
      yield* Database.add(Project.make({ name: PROJECT_NAME, taskSet: Ref.make(taskSet) }));
      yield* Database.flush();
      return {};
    }),
  dbQuery: () =>
    Effect.gen(function* () {
      const invocations = yield* toolInvocations();
      const called = new Set(invocations.map((invocation) => invocation.name));
      const trace = {
        // Absent `operationKey` is the signature of a tool that is not Operation-backed — which is
        // exactly what an MCP tool is, so it is also how this scorer tells the two surfaces apart.
        reachedOverMcp: invocations.some(
          (invocation) => invocation.name === INVOKE_OPERATION && invocation.operationKey === undefined,
        ),
        discovered: called.has(QUERY_OPERATIONS),
        erroredTools: invocations.filter((invocation) => invocation.error).map((invocation) => invocation.name),
      };
      const empty = { ...trace, completed: false, started: false, described: false, taskCount: 0 };

      const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
      const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
      if (!taskSet) {
        return empty;
      }

      const tasks = yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
      const byTitle = (title: string) => tasks.find((candidate) => candidate.title === title);

      return {
        ...trace,
        completed: byTitle(ROTATE)?.status === 'done',
        started: byTitle(BACKFILL)?.status === 'started',
        described: byTitle(BACKFILL)?.description?.includes(DESCRIPTION) ?? false,
        // The ledger's own length, not a filter: an agent that cannot find a task tends to create a
        // new one and report success, which every title-keyed check above would happily pass.
        taskCount: tasks.length,
      };
    }),
});

evalite('MCP server — the projected surface drives the space over a real transport', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'task-completed',
      description: 'The first task is done in the database, not merely reported done.',
      scorer: ({ output }) => (output.dbQuery.completed ? 1 : 0),
    },
    {
      name: 'task-started-and-described',
      description: 'The second task carries both the status and the description from one prompt.',
      scorer: ({ output }) => (output.dbQuery.started && output.dbQuery.described ? 1 : 0),
    },
    {
      name: 'ledger-intact',
      description: 'Still exactly two tasks — the agent updated the ledger rather than adding to it.',
      scorer: ({ output }) => (output.dbQuery.taskCount === 2 ? 1 : 0),
    },
    {
      name: 'went-through-mcp',
      description: 'Discovery and the writes went over the MCP verbs, and none of them errored.',
      scorer: ({ output }) =>
        output.dbQuery.reachedOverMcp && output.dbQuery.discovered && output.dbQuery.erroredTools.length === 0 ? 1 : 0,
    },
  ],
});
