//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Plan } from '@dxos/assistant-toolkit';
import { trim } from '@dxos/util';

import { completedBlocks, findObject, toolInvocations } from '../assertions';
import { createEvalRunner } from '../runner';

// Ported from the gated `Planning` scenario (../testing/planning.test.ts).
// Grades the real plan/task DB state and tool-invocation trace directly instead of the agent's
// self-reported completedCriteria.
//
// Two of the original criteria aren't checked deterministically here: "a 3-line haiku was
// written for each topic" is narrowed to "the topic was mentioned in the assistant's response"
// (line-count/quality is a content-judgment call, not yet backed by an LLM-judge scorer — see
// TESTING.md Phase 2 "More scorers"); the topic-mention check below is the deterministic proxy.

const UPDATE_TASKS_OPERATION_KEY = 'dxn:org.dxos.function.planning.updateTasks';
const OBJECT_WRITE_OPERATION_KEYS = [
  'dxn:org.dxos.function.database.objectCreate',
  'dxn:org.dxos.function.database.objectUpdate',
];
const PLAN_TYPENAME = 'org.dxos.type.plan';

const TOPICS = ['spring rain', 'ocean waves', 'night stars'];
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'spring rain': ['spring', 'rain'],
  'ocean waves': ['ocean', 'wave'],
  'night stars': ['night', 'star'],
};

const task = createEvalRunner({
  sessionChat: true,
  instructions: trim`
    Enable the planning skill (key: org.dxos.skill.planning) using the skill manager.

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
        .join('\n')
        .toLowerCase();

      const updateTasksCalls = invocations.filter(
        (invocation) => invocation.operationKey === UPDATE_TASKS_OPERATION_KEY,
      );
      const directPlanWrites = invocations.filter(
        (invocation) =>
          OBJECT_WRITE_OPERATION_KEYS.includes(invocation.operationKey ?? '') &&
          invocation.input.includes(PLAN_TYPENAME),
      );

      return {
        taskCount: plan?.tasks.length ?? 0,
        allTasksDone: (plan?.tasks.length ?? 0) === 3 && plan!.tasks.every((planTask) => planTask.status === 'done'),
        allTopicsMentioned: TOPICS.every((topic) =>
          TOPIC_KEYWORDS[topic].some((keyword) => assistantText.includes(keyword)),
        ),
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
      name: 'all-topics-addressed',
      description: 'The assistant response mentions all three haiku topics.',
      scorer: ({ output }) => (output.dbQuery.allTopicsMentioned ? 1 : 0),
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
