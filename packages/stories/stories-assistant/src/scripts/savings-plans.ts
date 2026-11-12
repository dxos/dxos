//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';

import { Calculate } from '../testing/calculator.ts';
import { composerAsides, threadPrompt } from '../testing/scripted.ts';

/** The prompts the demo sends, in order. */
export const SAVINGS_PROMPTS = {
  compare: 'Compare three savings plans for $10,000 at 4%, 6% and 8% a year over 30 years.',
  quick: 'Meanwhile, what is 17 × 23?',
} as const;

type Plan = {
  /** Names the plan's thread capture; letters only, as a placeholder name. */
  readonly key: string;
  readonly name: string;
  readonly rate: number;
  /** The balance after 10, 20 and 30 years, as the calculator returns them. */
  readonly values: readonly string[];
};

export const PLANS: readonly Plan[] = [
  { key: 'planA', name: 'Plan A', rate: 4, values: ['14,802.44', '21,911.23', '32,433.98'] },
  { key: 'planB', name: 'Plan B', rate: 6, values: ['17,908.48', '32,071.35', '57,434.91'] },
  { key: 'planC', name: 'Plan C', rate: 8, values: ['21,589.25', '46,609.57', '100,626.57'] },
];

const YEARS = [10, 20, 30] as const;

const CALCULATE = Operation.toolName(Calculate);

const purposeOf = (plan: Plan) => `${plan.name} · ${plan.rate}%`;

const taskOf = (plan: Plan) =>
  `Compute the balance of $10,000 saved at ${plan.rate}% a year, compounded yearly, after 10, 20 and 30 years.`;

/** The agent hands each plan to a subagent at once, then waits for each in turn and compares their answers. */
const agent = ScriptedScene.conversation('agent', [
  ScriptedScene.turn('user', 'Compare three savings plans'),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning('Each plan is independent, so each can be worked out by a subagent in parallel.'),
      ScriptedScene.text('I will hand each plan to a subagent and compare their results.'),
      ...PLANS.map((plan) =>
        ScriptedScene.toolCall('thread_delegate', { task: taskOf(plan), purpose: purposeOf(plan) }),
      ),
    ],
    { delay: '1200 millis' },
  ),
  // One turn started all three threads, so each `tool` turn reads its own id from the same results.
  ...PLANS.map((plan) =>
    ScriptedScene.turn('tool', `Started subagent thread ${ScriptedScene.threadId(plan.key)} ("${purposeOf(plan)}")`),
  ),
  ...PLANS.map((plan) =>
    ScriptedScene.turn(
      'assistant',
      [
        ScriptedScene.text(`Waiting for ${plan.name}.`),
        ScriptedScene.toolCall('thread_wait', { thread: ScriptedScene.threadId(plan.key) }),
      ],
      { delay: '500 millis' },
    ),
  ),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(
        [
          'After 30 years, $10,000 grows to:',
          '',
          '| Plan | Rate | 10 years | 20 years | 30 years |',
          '| --- | --- | --- | --- | --- |',
          ...PLANS.map(
            ({ name, rate, values }) => `| ${name} | ${rate}% | $${values[0]} | $${values[1]} | $${values[2]} |`,
          ),
          '',
          'Plan C ends with about three times what Plan A does: two extra points a year compound into a large gap.',
        ].join('\n'),
      ),
    ],
    { delay: '1500 millis' },
  ),
]);

/** A subagent computes its plan one calculator call at a time, then reports. */
const subagent = (plan: Plan) =>
  ScriptedScene.conversation(plan.name, [
    ScriptedScene.turn('user', taskOf(plan)),
    ...YEARS.map((years) =>
      ScriptedScene.turn(
        'assistant',
        [
          ScriptedScene.reasoning(`Balance after ${years} years at ${plan.rate}%.`),
          ScriptedScene.text(`After ${years} years…`),
          ScriptedScene.toolCall(CALCULATE, { expression: `10000*(1+${plan.rate}/100)^${years}` }),
        ],
        { delay: `${4 + plan.rate / 2} seconds` },
      ),
    ),
    ScriptedScene.turn(
      'assistant',
      [
        ScriptedScene.text(
          `At ${plan.rate}%, $10,000 grows to $${plan.values[0]} after 10 years, $${plan.values[1]} after 20 and ` +
            `$${plan.values[2]} after 30.`,
        ),
      ],
      { delay: '600 millis' },
    ),
  ]);

/** A question sent while the subagents work, answered at once in a light thread. */
const quick = ScriptedScene.conversation('quick question', [
  ScriptedScene.turn('user', '17 × 23'),
  ScriptedScene.turn('assistant', [ScriptedScene.text('17 × 23 = 391.')], { delay: '900 millis' }),
]);

/** Savings plans: an agent delegates three plans to subagents and compares their answers. */
export const savingsPlans = ScriptedScene.make([agent, ...PLANS.map(subagent), quick], {
  asides: composerAsides,
  promptOf: threadPrompt,
});
