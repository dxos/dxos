//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Outline } from '@dxos/types';
import { trim } from '@dxos/util';

import { completedBlocks, findObject } from '../assertions.ts';
import { judge } from '../judge.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';

// Ported from the gated `Planning` scenario (../testing/planning.test.ts).
// Grades the real outline-checklist DB state and tool-invocation trace directly instead of the agent's
// self-reported completedCriteria. "A 3-line haiku was written for each topic" — a content
// judgment a deterministic check can't make — is graded by an LLM judge (TESTING.md dimensions
// A/B/H); every other criterion stays dimension-G (deterministic).

const UPDATE_TASKS_OPERATION_KEY = 'dxn:org.dxos.operation.assistantToolkit.updateTasks';
const OBJECT_WRITE_OPERATION_KEYS = [
  'dxn:org.dxos.operation.space.addObject',
  'dxn:org.dxos.operation.space.updateObject',
];
const OUTLINE_TYPENAME = 'org.dxos.type.outline';

const HAIKU_JUDGE_RUBRIC = trim`
  You are grading an AI assistant's chat transcript against one criterion: does it contain three
  distinct haiku-style poems (roughly 3 lines each), one for each of these topics — "spring rain",
  "ocean waves", "night stars"?

  Pass only if all three topics each have their own short, line-broken poem about that topic. Fail
  if any topic is missing, off-topic, merged with another topic's poem, or reduced to a single
  unbroken sentence instead of a short multi-line poem.
`;

/** The plan's checklist items, parsed from the outline the session kept. */
const checklist = Effect.gen(function* () {
  const outline = yield* findObject(Outline.Outline, () => true);
  const text = outline ? yield* Database.load(outline.content).pipe(Effect.orElseSucceed(() => undefined)) : undefined;
  return Outline.parseChecklist(text?.content ?? '');
});

/** The judge's verdict on the haikus the session wrote into the chat feed. */
const haikuVerdict = completedBlocks().pipe(
  Effect.map((blocks) =>
    blocks
      .filter(({ role, block }) => role === 'assistant' && block._tag === 'text')
      .map(({ block }) => (block as { text: string }).text)
      .join('\n'),
  ),
  Effect.flatMap((assistantText) => judge(HAIKU_JUDGE_RUBRIC, assistantText)),
);

const SCORERS = [
  Scorer.make({
    name: 'exactly-three-tasks',
    description: 'Exactly 3 checklist items exist for the three haiku topics.',
    query: checklist,
    score: (items) => items.length === 3,
  }),
  Scorer.make({
    name: 'all-tasks-done',
    description: 'All 3 tasks are marked done.',
    query: checklist,
    score: (items) => items.length === 3 && items.every((item) => item.done),
  }),
  Scorer.make({
    name: 'haikus-well-formed',
    description: 'An LLM judge confirms all three topics have their own well-formed haiku.',
    query: haikuVerdict,
    score: (verdict) => verdict.pass,
  }),
  Scorer.toolCalls({
    name: 'used-update-tasks',
    description: 'The assistant-toolkit-update-tasks tool was used at least 3 times (once per task).',
    score: (invocations) =>
      invocations.filter((invocation) => invocation.operationKey === UPDATE_TASKS_OPERATION_KEY).length >= 3,
  }),
  Scorer.toolCalls({
    name: 'no-direct-plan-manipulation',
    description: 'The outline was never written via a raw database object-create/update call.',
    score: (invocations) =>
      !invocations.some(
        (invocation) =>
          OBJECT_WRITE_OPERATION_KEYS.includes(invocation.operationKey ?? '') &&
          invocation.input.includes(OUTLINE_TYPENAME),
      ),
  }),
];

const task = createEvalRunner({
  sessionChat: true,
  instructions: trim`
    Create exactly 3 plan tasks with assistant-toolkit-update-tasks for writing a short haiku (3 lines) on these topics:
    1. spring rain
    2. ocean waves
    3. night stars

    Work through the tasks one at a time:
    - Mark only the current task in-progress.
    - Write the haiku for that topic in your response (visible in the chat feed).
    - Mark that task done with assistant-toolkit-update-tasks before starting the next task.

    When all three haikus are written and all tasks are done, call completeJob.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  // Three sequential subtasks, each a assistant-toolkit-update-tasks call + haiku turn, plus a final judge call.
  timeout: 150_000,
  scorers: SCORERS,
});

evalite('Planning — create three haiku tasks and complete each one', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
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
