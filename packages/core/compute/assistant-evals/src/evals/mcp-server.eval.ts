//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { evalite } from 'evalite';

import * as Project from '@dxos/compute/Project';
import { Database, Filter, Query, Ref, Type } from '@dxos/echo';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { findObject } from '../assertions.ts';
import { SERVER, runClaudeEval, tool } from '../claude-harness.ts';
import type * as McpLatency from '../McpLatency.ts';
import * as McpTarget from '../McpTarget.ts';
import * as Scorer from '../Scorer.ts';

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
// `DX_EVAL_MCP_TARGET` picks the surface: `local` (the in-process host, the default), `local-edge`
// (`wrangler dev`), or the deployed `dev` / `main` / `prod` workers. Only `local` can be graded from
// the database — a deployed worker serves its own data plane, which this process neither seeds nor
// reads — so a remote run drops the write stages and scores what a client can see from outside:
// discovery through the server, and per-tool latency.
//

const TARGET = McpTarget.fromEnv();

const REMOTE = !McpTarget.isLocal(TARGET);

/**
 * The calls the latency report is built from.
 *
 * `queryOperations` and `loadSkill` answer out of the registry and measure little more than the
 * transport, so most of the set is `invokeOperation`: that is the tool an agent actually spends its
 * turns in, and the only one whose latency includes resolving a space and running a handler against
 * the database. Every operation here is `mutation('none')` and needs no object reference, so the
 * same set is as safe against production as against the in-process host.
 *
 * Rows come back keyed per operation (`invokeOperation:<key>`), because a single figure for
 * `invokeOperation` would average a registry lookup against a full-content query.
 */
const readProbes = (spaceId: string): McpLatency.Probe[] => [
  { tool: 'queryOperations', args: { query: 'task' } },
  { tool: 'loadSkill' },
  // Cheapest handler that still reaches the database: an unfiltered listing, ids and labels only.
  { tool: 'invokeOperation', args: { key: 'org.dxos.operation.space.queryObjects', input: { limit: 10 }, spaceId } },
  // The same verb with the objects loaded, which is what separates a query's cost from a handler's.
  // Labelled, because the operation key alone would fold it into the row above and average the two
  // shapes into a figure describing neither.
  {
    tool: 'invokeOperation',
    label: 'invokeOperation:org.dxos.operation.space.queryObjects(content)',
    args: {
      key: 'org.dxos.operation.space.queryObjects',
      input: { typename: Type.getTypename(Task.Task), includeContent: true, limit: 10 },
      spaceId,
    },
  },
  { tool: 'invokeOperation', args: { key: 'org.dxos.operation.tasks.listSessions', input: { limit: 10 }, spaceId } },
];

/**
 * Probes that need an object to address, and therefore a space this process seeded.
 *
 * A reference travels as the wire envelope the server documents, so these also time the decode path
 * a ref-taking operation goes through — which no ref-free probe covers.
 */
const refProbes = (spaceId: string, projectId: string): McpLatency.Probe[] => {
  const project = { '/': `echo://${spaceId}/${projectId}` };
  return [
    { tool: 'invokeOperation', args: { key: 'org.dxos.operation.projects.get', input: { project }, spaceId } },
    { tool: 'invokeOperation', args: { key: 'org.dxos.operation.tasks.list', input: { project }, spaceId } },
  ];
};

/**
 * Ceiling for the p95 of a tool call, in ms. The in-process host is a function call behind a
 * loopback socket; a deployed worker is a TLS round trip in front of a data plane, so the two cannot
 * share a number. Override with `DX_EVAL_MCP_LATENCY_BUDGET_MS`.
 */
const LATENCY_BUDGET = McpTarget.latencyBudget(REMOTE ? 3_000 : 500);

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

/**
 * What each turn established, at the turn rather than at the end.
 *
 * A staged fact cannot be recovered from the final space — "the read-only turn changed nothing" is
 * only true between two writes — so the turns record them and the scorers below read them back. The
 * dimensions that *are* end state ask the database their own question instead.
 */
type Staged = {
  scaffolded: boolean;
  listed: boolean;
  readOnly: boolean;
  completed: boolean;
  started: boolean;
};

const NOTHING_STAGED: Staged = {
  scaffolded: false,
  listed: false,
  readOnly: false,
  completed: false,
  started: false,
};

/**
 * Latency as a graded dimension, carrying the whole report as its value: the pass/fail is the p95
 * against a budget, but what a reader of a run wants is the per-tool spread next to it.
 */
const latencyScorer = (report?: McpLatency.Report): Scorer.Any =>
  Scorer.make({
    name: 'tool-latency',
    description: `Client-observed MCP tool latency against "${TARGET}"; p95 within ${LATENCY_BUDGET}ms and no errored call.`,
    query: Effect.succeed(report),
    score: (value) => value != null && value.stats['*'].errors === 0 && value.stats['*'].p95 <= LATENCY_BUDGET,
  });

/** What a deployed target can be held to: the surface answered, and it answered fast enough. */
const remoteScorers = (discovered: boolean, report?: McpLatency.Report): Scorer.Any[] => [
  Scorer.make({
    name: 'operations-discovered',
    description: 'The agent reached the deployed surface and got operations back through it.',
    query: Effect.succeed(discovered),
    score: (ok) => ok,
  }),
  latencyScorer(report),
];

const scorers = (staged: Staged, report?: McpLatency.Report): Scorer.Any[] => [
  Scorer.make({
    name: 'scaffold-visible',
    description: 'The seeded ledger is readable outside the agent before the run starts.',
    query: Effect.succeed(staged.scaffolded),
    score: (ok) => ok,
  }),
  Scorer.make({
    name: 'tasks-listed',
    description: 'The agent read both tasks through the server rather than answering from the prompt.',
    query: Effect.succeed(staged.listed),
    score: (ok) => ok,
  }),
  Scorer.make({
    name: 'read-turn-changed-nothing',
    description: 'The read-only turn left every task as it found it.',
    query: Effect.succeed(staged.readOnly),
    score: (ok) => ok,
  }),
  Scorer.make({
    name: 'task-completed',
    description: 'The named task is done in the database, and only that task moved.',
    query: Effect.succeed(staged.completed),
    score: (ok) => ok,
  }),
  Scorer.make({
    name: 'follow-up-turn-wrote',
    description: 'A second turn set the other task started with its description, without rolling the first back.',
    query: Effect.succeed(staged.started),
    score: (ok) => ok,
  }),
  Scorer.database({
    name: 'ledger-intact',
    // The ledger's own length, not a filter: the natural failure of an agent that cannot find a task
    // is to create a new one and report success, which every title-keyed check would pass.
    description: 'Still exactly two tasks — the agent updated the ledger rather than adding to it.',
    query: Query.select(Filter.type(Task.Task)),
    score: (tasks) => tasks.length === 2,
  }),
  latencyScorer(report),
];

/** Names and descriptions only; the marks come from the run, through `output.scores`. */
const SCORERS = REMOTE ? remoteScorers(false) : scorers(NOTHING_STAGED);

/**
 * A deployed worker, driven from the outside: no seed, no database check, one discovery turn and a
 * latency report. It is what remains measurable when the space the agent acts on is not this
 * process's.
 */
const remoteTask = () =>
  runClaudeEval({ skills: [], target: TARGET }, async ({ spaceId, send, latency, score }) => {
    const report = await latency(readProbes(spaceId));
    const turn = await send(
      `Using only the ${SERVER} MCP server, list the operations it offers for working with tasks. ` +
        'Reply with their keys, one per line, and change nothing.',
    );
    const discovered = !turn.isError && turn.toolCalls.includes(tool('queryOperations'));
    const scores = await score(remoteScorers(discovered, report));
    return {
      scores,
      latency: report,
      turns: [turn].map(({ isError, toolCalls, result }) => ({ isError, toolCalls, result })),
    };
  });

const localTask = () =>
  runClaudeEval(
    {
      target: TARGET,
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
    async ({ spaceId, send, query, score, latency }) => {
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

      // After the turns, so the probe's own connection is not competing with the agent's for the
      // listener — and so a latency figure is never what a scenario's writes waited behind. The
      // ledger is at its fullest here too, which is the state worth timing a read against.
      const project = await query(findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME));
      const report = await latency([...readProbes(spaceId), ...(project ? refProbes(spaceId, project.id) : [])]);

      const scores = await score(scorers({ scaffolded, listed, readOnly, completed, started }, report));
      return {
        scores,
        latency: report,
        turns: [read, complete, start].map(({ isError, toolCalls, result }) => ({ isError, toolCalls, result })),
      };
    },
  );

evalite(`MCP server (${TARGET}) — Claude Code drives the projected surface`, {
  data: [{ input: null }],
  task: REMOTE ? remoteTask : localTask,
  scorers: Scorer.toEvalite(SCORERS),
});
