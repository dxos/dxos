//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Operation from '@dxos/compute/Operation';

import { StoryRole } from '../modules/index.ts';
import {
  Calculate,
  CalculatorSkill,
  ModuleContainer,
  createDecorators,
  storyParameters,
  submitPrompt,
} from '../testing/index.ts';

const { text, reasoning, toolCall } = ScriptedLanguageModel;

/**
 * Subagents on light threads: the agent delegates self-contained tasks with `thread_delegate`; each runs in a
 * background thread of its own that starts with nothing but its task, shown as a card, and only its final answer joins
 * the conversation. The agent waits for the subagents with `thread_wait` while the reader keeps chatting. See
 * `packages/core/compute/trajectory/LIGHT-THREADS.mdl` (F-8).
 */
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Subagents',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The prompts the demo sends, in order. */
const PROMPTS = {
  compare: 'Compare three savings plans for $10,000 at 4%, 6% and 8% a year over 30 years.',
  quick: 'Meanwhile, what is 17 × 23?',
} as const;

const CALCULATE = Operation.toolName(Calculate);

type Plan = { readonly name: string; readonly rate: number; readonly values: readonly string[] };

/** Each plan's balance after 10, 20 and 30 years, as the calculator returns them. */
const PLANS: readonly Plan[] = [
  { name: 'Plan A', rate: 4, values: ['14,802.44', '21,911.23', '32,433.98'] },
  { name: 'Plan B', rate: 6, values: ['17,908.48', '32,071.35', '57,434.91'] },
  { name: 'Plan C', rate: 8, values: ['21,589.25', '46,609.57', '100,626.57'] },
];

const YEARS = [10, 20, 30] as const;

const purposeOf = (plan: Plan) => `${plan.name} · ${plan.rate}%`;

const taskOf = (plan: Plan) =>
  `Compute the balance of $10,000 saved at ${plan.rate}% a year, compounded yearly, after 10, 20 and 30 years.`;

/** A status line the runtime appends about other threads; never the request itself. */
const isStatusLine = (value: string) => /^Thread \S+ .* is (running|done)/.test(value);

/** The text parts of a message, in order. */
const textParts = (content: ScriptedLanguageModel.ScriptedRequest['prompt']['content'][number]): string[] =>
  typeof content.content === 'string'
    ? [content.content]
    : content.content.flatMap((part) => (part.type === 'text' ? [part.text] : []));

/** The request a call answers: the last text of the last user message that is not a thread status line or snapshot. */
const currentRequest = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): { text: string; index: number } => {
  for (let index = prompt.content.length - 1; index >= 0; index--) {
    const message = prompt.content[index];
    if (message.role !== 'user') {
      continue;
    }
    const request = textParts(message)
      .filter((part) => !isStatusLine(part) && !part.includes('<thread '))
      .at(-1);
    if (request !== undefined) {
      return { text: request, index };
    }
  }
  return { text: '', index: -1 };
};

/** Tool results since the request: how far through its loop the call is. */
const toolResultsSince = ({ prompt }: ScriptedLanguageModel.ScriptedRequest, index: number) =>
  prompt.content.slice(index + 1).filter((message) => message.role === 'tool').length;

/** The thread a subagent was started in, from the delegating call's result (quotes escaped in the prompt's JSON). */
const startedThread = (prompt: string, plan: Plan) =>
  new RegExp(`Started subagent thread (\\w+) \\(\\\\*"${purposeOf(plan)}`).exec(prompt)?.[1];

/** A subagent computes its plan one calculator call at a time, then reports. */
const subagent = (plan: Plan, step: number): ScriptedLanguageModel.ScriptedTurn => {
  if (step < YEARS.length) {
    const years = YEARS[step];
    return {
      delay: `${4 + plan.rate / 2} seconds`,
      parts: [
        reasoning(`Balance after ${years} years at ${plan.rate}%.`),
        text(`After ${years} years…`),
        toolCall(CALCULATE, { expression: `10000*(1+${plan.rate}/100)^${years}` }),
      ],
    };
  }
  return {
    delay: '600 millis',
    parts: [
      text(
        `At ${plan.rate}%, $10,000 grows to $${plan.values[0]} after 10 years, $${plan.values[1]} after 20 and ` +
          `$${plan.values[2]} after 30.`,
      ),
    ],
  };
};

/**
 * The agent hands each plan to a subagent, then waits for them one by one and compares their answers; a question sent
 * meanwhile is answered at once in a light thread.
 */
const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  // Side calls (chat naming) offer no tools.
  if (!request.tools.includes(CALCULATE)) {
    return { parts: [text('Savings plans')] };
  }
  const { text: current, index } = currentRequest(request);
  const step = toolResultsSince(request, index);
  const plan = PLANS.find((candidate) => current === taskOf(candidate));
  if (plan !== undefined) {
    return subagent(plan, step);
  }
  if (current.includes('17 × 23')) {
    return { delay: '900 millis', parts: [text('17 × 23 = 391.')] };
  }
  if (current.includes('savings plans')) {
    const prompt = JSON.stringify(request.prompt.content);
    const threads = PLANS.map((candidate) => startedThread(prompt, candidate));
    if (threads.some((thread) => thread === undefined)) {
      return {
        delay: '1200 millis',
        parts: [
          reasoning('Each plan is independent, so each can be worked out by a subagent in parallel.'),
          text('I will hand each plan to a subagent and compare their results.'),
          ...PLANS.map((candidate) =>
            toolCall('thread_delegate', { task: taskOf(candidate), purpose: purposeOf(candidate) }),
          ),
        ],
      };
    }
    const pending = PLANS.findIndex((candidate) => !prompt.includes(`$${candidate.values[2]} after 30`));
    if (pending !== -1) {
      return {
        delay: '500 millis',
        parts: [text(`Waiting for ${PLANS[pending].name}.`), toolCall('thread_wait', { thread: threads[pending] })],
      };
    }
    return {
      delay: '1500 millis',
      parts: [
        text(
          [
            'After 30 years, $10,000 grows to:',
            '',
            '| Plan | Rate | 10 years | 20 years | 30 years |',
            '| --- | --- | --- | --- | --- |',
            ...PLANS.map(
              (candidate) =>
                `| ${candidate.name} | ${candidate.rate}% | $${candidate.values[0]} | $${candidate.values[1]} | ` +
                `$${candidate.values[2]} |`,
            ),
            '',
            'Plan C ends with about three times what Plan A does: two extra points a year compound into a large gap.',
          ].join('\n'),
        ),
      ],
    };
  }
  return { parts: [text('Done.')] };
};

const decorators = createDecorators({
  skills: [CalculatorSkill.key],
  scripted: script,
  assistantSettings: { parallelThreads: true },
});

/**
 * Scripted (offline): the agent delegates three plans to subagents, which run as background cards; a question sent
 * meanwhile answers at once; the comparison arrives when every subagent has reported.
 */
export const Scripted: Story = {
  decorators,
  args: {
    layout: [[StoryRole.Chat]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, PROMPTS.compare);
    // Every subagent works in a card of its own.
    await waitFor(() => expect(canvas.getAllByTestId('chat.lane-card').length).toBeGreaterThanOrEqual(PLANS.length), {
      timeout: 30_000,
    });
    await submitPrompt(canvasElement, PROMPTS.quick);
    await canvas.findAllByText(/17 × 23 = 391/, {}, { timeout: 30_000 });
    await canvas.findAllByText(/two extra points a year/, {}, { timeout: 120_000 });
  },
};

/** {@link Scripted} without its play function, for a recorded walkthrough that types the prompts itself. */
export const Demo: Story = {
  decorators,
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
  },
  tags: ['!test'],
};
