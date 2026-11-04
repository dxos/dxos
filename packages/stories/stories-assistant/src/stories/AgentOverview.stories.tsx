//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
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
 * What the agent is doing, at a glance: the chat beside a compressed git graph of it. The trunk lists the tasks the
 * agent finished, each thread still running is a branch (a subagent branches off the thread that delegated it), and
 * the prompts it has yet to take wait on a branch of their own. Messages and tool calls never show.
 */
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/AgentOverview',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The prompts the demo sends, in order: a delegated job, a long job, one that waits for it, then two that queue. */
const PROMPTS = {
  compare: 'Compare three savings plans for $10,000 at 4%, 6% and 8% a year over 30 years.',
  research: 'Meanwhile, research the factorials of 5 to 9 and summarise them.',
  translate: 'When the research is done, translate its summary into French.',
  quick: 'What is 17 × 23?',
  capital: 'And what is the capital of Australia?',
} as const;

/** Two threads at once, and two subagents: enough to see work wait for a free slot. */
const THREAD_LIMIT = 2;

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
  new RegExp(`Started subagent thread ([\\w@-]+) \\(\\\\*"${purposeOf(plan)}`).exec(prompt)?.[1];

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

/** The delegating turn: hand each plan to a subagent, wait for them one by one, then compare. */
const compare = (request: ScriptedLanguageModel.ScriptedRequest): ScriptedLanguageModel.ScriptedTurn => {
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
          '| Plan | Rate | 30 years |',
          '| --- | --- | --- |',
          ...PLANS.map((candidate) => `| ${candidate.name} | ${candidate.rate}% | $${candidate.values[2]} |`),
          '',
          'Plan C ends with about three times what Plan A does: two extra points a year compound into a large gap.',
        ].join('\n'),
      ),
    ],
  };
};

/**
 * A fixed agent: a delegated comparison, a slow research loop, a translation that waits for the research, and quick
 * answers for the prompts that queue behind them.
 */
const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  // Side calls (chat naming) offer no tools.
  if (!request.tools.includes(CALCULATE)) {
    return { parts: [text('Savings and factorials')] };
  }
  const { text: current, index } = currentRequest(request);
  const step = toolResultsSince(request, index);
  const plan = PLANS.find((candidate) => current === taskOf(candidate));
  if (plan !== undefined) {
    return subagent(plan, step);
  }
  if (current.includes('savings plans')) {
    return compare(request);
  }
  if (current.includes('research the factorials')) {
    if (step < 5) {
      const value = step + 5;
      return {
        delay: '7 seconds',
        parts: [
          reasoning(`Computing ${value}!.`),
          text(`Computing ${value}!…`),
          toolCall(CALCULATE, { expression: `${value}!` }),
        ],
      };
    }
    return {
      delay: '800 millis',
      parts: [text('5! = 120, 6! = 720, 7! = 5,040, 8! = 40,320 and 9! = 362,880: each is the previous one times n.')],
    };
  }
  if (current.includes('translate')) {
    if (step === 0) {
      const sibling = /<thread id="([^"]+)" title="Meanwhile, research/.exec(request.text)?.[1];
      return sibling
        ? {
            delay: '600 millis',
            parts: [
              text('That needs the research first; waiting for it.'),
              toolCall('thread_wait', { thread: sibling }),
            ],
          }
        : { parts: [text('There is no research to translate yet.')] };
    }
    return {
      delay: '900 millis',
      parts: [
        text('5! = 120, 6! = 720, 7! = 5 040, 8! = 40 320 et 9! = 362 880 : chacun est le précédent multiplié par n.'),
      ],
    };
  }
  if (current.includes('17 × 23')) {
    return { delay: '2 seconds', parts: [text('17 × 23 = 391.')] };
  }
  if (current.includes('capital of Australia')) {
    return { delay: '2 seconds', parts: [text('Canberra.')] };
  }
  return { parts: [text('Done.')] };
};

const decorators = createDecorators({
  skills: [CalculatorSkill.key],
  scripted: script,
  assistantSettings: { parallelThreads: true, parallelThreadLimit: THREAD_LIMIT },
});

/**
 * Scripted (offline): the overview shows the subagents under the comparison, the research and the translation that
 * waits for it side by side, and the last two prompts queued until a thread is free; finished work collapses onto the
 * trunk.
 */
export const Scripted: Story = {
  decorators,
  args: {
    layout: [[StoryRole.Chat], [StoryRole.TrajectoryOverview]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, PROMPTS.compare);
    await canvas.findAllByText(/Plan C · 8%/, {}, { timeout: 30_000 });
    await submitPrompt(canvasElement, PROMPTS.research);
    await canvas.findAllByText(/Computing 5!/, {}, { timeout: 30_000 });
    await submitPrompt(canvasElement, PROMPTS.translate);
    await submitPrompt(canvasElement, PROMPTS.quick);
    await submitPrompt(canvasElement, PROMPTS.capital);

    const overview = await canvas.findByTestId('trajectory-overview');
    // The last prompts wait for a free thread, and the translation for the research.
    await waitFor(() => expect(overview.textContent).toMatch(/capital of Australia/), { timeout: 30_000 });
    await waitFor(() => expect(overview.textContent).toMatch(/waiting for/), { timeout: 30_000 });
    // Once everything has run, only finished tasks remain, on the trunk.
    await canvas.findAllByText(/chacun est le précédent/, {}, { timeout: 120_000 });
    await canvas.findAllByText(/two extra points a year/, {}, { timeout: 120_000 });
    await waitFor(() => expect(overview.textContent).toMatch(/0 running/), { timeout: 60_000 });
  },
};

/** {@link Scripted} without its play function, for a recorded walkthrough that types the prompts itself. */
export const Demo: Story = {
  decorators,
  args: {
    layout: [[StoryRole.Chat], [StoryRole.TrajectoryOverview]],
  },
  tags: ['!test'],
};
