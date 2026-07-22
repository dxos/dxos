//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Plan } from '@dxos/assistant-toolkit';
import { EffectEx } from '@dxos/effect';
import { trim } from '@dxos/util';

import { completedBlocks, findObject, toolInvocations } from '../assertions';
import { judge } from '../judge';
import { createEvalRunner } from '../runner';

// Ported from the gated `Planning` scenario (../testing/planning.test.ts).
// Grades the real plan/task DB state and tool-invocation trace directly instead of the agent's
// self-reported completedCriteria. "A 3-line haiku was written for each topic" — a content
// judgment a deterministic check can't make — is graded by an LLM judge (TESTING.md dimensions
// A/B/H); every other criterion stays dimension-G (deterministic).

const UPDATE_TASKS_OPERATION_KEY = 'dxn:org.dxos.function.planning.updateTasks';
const OBJECT_WRITE_OPERATION_KEYS = [
  'dxn:org.dxos.function.database.objectCreate',
  'dxn:org.dxos.function.database.objectUpdate',
];
const PLAN_TYPENAME = 'org.dxos.type.plan';

const HAIKU_JUDGE_RUBRIC = trim`
  You are grading an AI assistant's chat transcript against one criterion: does it contain three
  distinct haiku-style poems (roughly 3 lines each), one for each of these topics — "spring rain",
  "ocean waves", "night stars"?

  Pass only if all three topics each have their own short, line-broken poem about that topic. Fail
  if any topic is missing, off-topic, merged with another topic's poem, or reduced to a single
  unbroken sentence instead of a short multi-line poem.
`;

const task = createEvalRunner({
  sessionChat: true,
  instructions: trim`
    Create exactly 3 plan tasks with update-tasks for writing a short haiku (3 lines) on these topics:
    1. spring rain
    2. ocean waves
    3. night stars

    Work through the tasks one at a time:
    - Mark only the current task in-progress.
    - Write the haiku for that topic in your response (visible in the chat feed).
    - Mark that task done with update-tasks before starting the next task.

    When all three haikus are written and all tasks are done, call completeJob.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  dbQuery: () =>
    Effect.gen(function* () {
      const plan = yield* findObject(Plan.Plan, () => true);
      const invocations = yield* toolInvocations();
      const blocks = yield* completedBlocks();

      const assistantText = blocks
        .filter(({ role, block }) => role === 'assistant' && block._tag === 'text')
        .map(({ block }) => (block as { text: string }).text)
        .join('\n');

      const updateTasksCalls = invocations.filter(
        (invocation) => invocation.operationKey === UPDATE_TASKS_OPERATION_KEY,
      );
      const directPlanWrites = invocations.filter(
        (invocation) =>
          OBJECT_WRITE_OPERATION_KEYS.includes(invocation.operationKey ?? '') &&
          invocation.input.includes(PLAN_TYPENAME),
      );
      const haikuVerdict = yield* judge(HAIKU_JUDGE_RUBRIC, assistantText);

      return {
        taskCount: plan?.tasks.length ?? 0,
        allTasksDone: (plan?.tasks.length ?? 0) === 3 && plan!.tasks.every((planTask) => planTask.status === 'done'),
        haikuVerdict,
        usedUpdateTasks: updateTasksCalls.length >= 3,
        noDirectPlanManipulation: directPlanWrites.length === 0,
      };
    }),
});

evalite('Planning — create three haiku tasks and complete each one', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'exactly-three-tasks',
      description: 'Exactly 3 tasks exist in the plan for the three haiku topics.',
      scorer: ({ output }) => (output.dbQuery.taskCount === 3 ? 1 : 0),
    },
    {
      name: 'all-tasks-done',
      description: 'All 3 tasks are marked done.',
      scorer: ({ output }) => (output.dbQuery.allTasksDone ? 1 : 0),
    },
    {
      name: 'haikus-well-formed',
      description: 'An LLM judge confirms all three topics have their own well-formed haiku.',
      scorer: ({ output }) => ({
        score: output.dbQuery.haikuVerdict.pass ? 1 : 0,
        metadata: { reasoning: output.dbQuery.haikuVerdict.reasoning },
      }),
    },
    {
      name: 'used-update-tasks',
      description: 'The update-tasks tool was used at least 3 times (once per task).',
      scorer: ({ output }) => (output.dbQuery.usedUpdateTasks ? 1 : 0),
    },
    {
      name: 'no-direct-plan-manipulation',
      description: 'The plan was never written via a raw database object-create/update call.',
      scorer: ({ output }) => (output.dbQuery.noDirectPlanManipulation ? 1 : 0),
    },
  ],
});

// A judge that only ever passes would be worthless as a scorer — this demonstrates it correctly
// fails malformed output against the same rubric used above, on a hand-crafted transcript rather
// than a live agent run.
const MALFORMED_HAIKU_TRANSCRIPT = trim`
  I wrote a haiku about spring rain: gentle drops falling softly on green leaves today.
`;

evalite('Planning — haiku judge correctly fails malformed output', {
  data: [{ input: { content: MALFORMED_HAIKU_TRANSCRIPT } }],
  task: (input: { content: string }) => EffectEx.runPromise(judge(HAIKU_JUDGE_RUBRIC, input.content)),
  scorers: [
    {
      name: 'judge-correctly-fails',
      description: 'The judge fails a transcript missing two of the three required topics.',
      scorer: ({ output }) => (output.pass === false ? 1 : 0),
    },
  ],
});
