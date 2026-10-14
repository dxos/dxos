//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { evalite } from 'evalite';

import * as Project from '@dxos/compute/Project';
import { Database, Filter, Query, Ref } from '@dxos/echo';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { type Turn } from '@dxos/test-utils/claude-agent';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { findObject } from '../assertions.ts';
import { SERVER, runClaudeEval, tool } from '../claude-harness.ts';
import * as Scorer from '../Scorer.ts';

//
// MCP code mode against the plain tool surface, on the work code mode exists for: one instruction
// that touches many objects. Both variants drive the in-process host with the same Claude Code agent,
// skills, seed and prompt; the only difference is whether `runScript` is served. Correctness is
// graded from the database, and the cost of getting there — tool calls, tokens, wall clock — rides
// the output, since that is the comparison the variant exists to make.
//

const VARIANTS = [
  { name: 'tools', input: { codeMode: false } },
  { name: 'code-mode', input: { codeMode: true } },
];

/** `DX_EVAL_ENGINES` narrows the matrix, comma-separated, as in `code-mode.eval.ts`. */
const selected = process.env.DX_EVAL_ENGINES?.trim()
  ? process.env.DX_EVAL_ENGINES.split(',').map((name) => name.trim())
  : undefined;

const PROJECT_NAME = 'Lighthouse';

/** Enough matching tasks that a call per task is visibly a different strategy from one program. */
const OPS = [
  'Ops: rotate the staging credentials',
  'Ops: renew the wildcard certificate',
  'Ops: prune stale preview deployments',
  'Ops: raise the database connection limit',
  'Ops: archive last quarter audit logs',
  'Ops: patch the bastion host kernel',
  'Ops: drain the legacy job queue',
  'Ops: resize the build cache volume',
];

/** The control group: a blanket update would move these too. */
const OTHERS = [
  'Draft the Q3 roadmap',
  'Review the onboarding guide',
  'Interview the design candidates',
  'Plan the offsite agenda',
];

type TaskRow = { title?: string; status?: string; priority?: string };

const readTasks = Effect.gen(function* () {
  const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
  const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
  if (!taskSet) {
    return [] as TaskRow[];
  }
  return yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
});

/** The turn's token spend, summed over its model calls. */
const tokens = (turn: Turn) => {
  let input = 0;
  let output = 0;
  for (const event of turn.events) {
    if (event?.type === 'assistant') {
      const usage = event.message?.usage ?? {};
      input +=
        (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
      output += usage.output_tokens ?? 0;
    }
  }
  return { input, output };
};

/** The CLI's own cost figure for the turn, from its `result` event. */
const costUsd = (turn: Turn): number | undefined => {
  const result = turn.events.find((event) => event?.type === 'result');
  return typeof result?.total_cost_usd === 'number' ? result.total_cost_usd : undefined;
};

type Outcome = { opsUpdated: number; othersUntouched: boolean; count: number; reported: boolean };

const scorers = ({ opsUpdated, othersUntouched, count, reported }: Outcome): Scorer.Any[] => [
  Scorer.make({
    name: 'ops-tasks-updated',
    description: 'Share of the Ops tasks that are done with priority high, read from the database.',
    score: Effect.succeed(opsUpdated / OPS.length),
  }),
  Scorer.make({
    name: 'others-untouched',
    description: 'Every non-Ops task is still todo with no priority — the update was targeted.',
    score: Effect.succeed(othersUntouched),
  }),
  Scorer.make({
    name: 'count-reported',
    description: 'The reply states how many tasks were changed.',
    score: Effect.succeed(reported),
  }),
  Scorer.database({
    name: 'ledger-intact',
    description: 'Still exactly the seeded tasks — the agent updated the ledger rather than adding to it.',
    query: Query.select(Filter.type(Task.Task)),
    score: (tasks) => tasks.length === count,
  }),
];

const NOTHING: Outcome = { opsUpdated: 0, othersUntouched: false, count: OPS.length + OTHERS.length, reported: false };

const task = ({ codeMode }: { codeMode: boolean }) =>
  runClaudeEval(
    {
      skills: [{ key: ProjectSkill.key, make: ProjectSkill.make, operations: ProjectSkill.operations }],
      plugins: [ProjectsPlugin.make(), TasksPlugin.make()],
      types: [Project.Project, Milestone.Milestone, Outline.Outline, Task.Task, TaskSet.TaskSet],
      codeMode,
      allowedTools: [
        tool('queryOperations'),
        tool('invokeOperation'),
        tool('loadSkill'),
        ...(codeMode ? [tool('runScript')] : []),
      ],
      seed: () =>
        Effect.gen(function* () {
          const tasks = yield* Effect.forEach([...OPS, ...OTHERS], (title) =>
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
    async ({ spaceId, send, query, score }) => {
      const turn = await send(
        `Using only the ${SERVER} MCP server, in space ${spaceId}: in the project "${PROJECT_NAME}", mark ` +
          'every task whose title starts with "Ops:" as done and set its priority to high. Update the ' +
          'existing tasks; do not create new ones, and leave every other task alone. Reply with how many ' +
          'tasks you changed.',
      );
      const after = await query(readTasks);
      const opsUpdated = OPS.filter((title) =>
        after.some((row) => row.title === title && row.status === 'done' && row.priority === 'high'),
      ).length;
      const othersUntouched = OTHERS.every((title) =>
        after.some((row) => row.title === title && row.status === 'todo' && row.priority === undefined),
      );
      const reported = new RegExp(`\\b(${OPS.length}|eight)\\b`, 'i').test(turn.result ?? '');
      const scores = await score(scorers({ opsUpdated, othersUntouched, count: OPS.length + OTHERS.length, reported }));
      const calls = turn.toolCalls.map((name) => name.replace(`mcp__${SERVER}__`, ''));
      return {
        scores,
        metrics: {
          variant: codeMode ? 'code-mode' : 'tools',
          toolCalls: calls.length,
          byTool: Object.fromEntries(
            [...new Set(calls)].map((name) => [name, calls.filter((call) => call === name).length]),
          ),
          tokens: tokens(turn),
          costUsd: costUsd(turn),
          durationMs: turn.end - turn.start,
          isError: turn.isError,
        },
        result: turn.result,
      };
    },
  );

evalite.each(selected ? VARIANTS.filter(({ name }) => selected.includes(name)) : VARIANTS)(
  'MCP code mode — bulk task update, tools vs runScript',
  {
    data: [{ input: null }],
    task: (_input: null, variant: { codeMode: boolean }) => task(variant),
    scorers: Scorer.toEvalite(scorers(NOTHING)),
  },
);
