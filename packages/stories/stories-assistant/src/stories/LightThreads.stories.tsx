//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Operation from '@dxos/compute/Operation';

import { StoryRole } from '../modules/index.ts';
import { Calculate, CalculatorSkill, ModuleContainer, createDecorators, storyParameters } from '../testing/index.ts';

const { text, reasoning, toolCall } = ScriptedLanguageModel;

/**
 * Light threads: a prompt sent while the agent works starts a thread of its own that runs beside the first, which goes
 * to the background as a fixed-height card in its original place; its final answer shows full height where it
 * completes. Each thread has a colour in its gutter. See
 * `packages/core/compute/trajectory/LIGHT-THREADS.mdl`.
 */
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/LightThreads',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The prompts the demo sends, in order: a long job, then requests that arrive while it runs. */
export const PROMPTS = {
  research: 'Research the factorials of 5 to 9 and summarise them.',
  quick: 'Meanwhile, what is 17 × 23?',
  capital: 'And what is the capital of Australia?',
  dependent: 'When the research is done, translate its summary into French.',
} as const;

const CALCULATE = Operation.toolName(Calculate);

/** A status line the runtime appends about other threads; never the request itself. */
const isStatusLine = (value: string) => /^Thread \S+ .* is (running|done)/.test(value);

/** The text parts of a message, in order. */
const textParts = (content: ScriptedLanguageModel.ScriptedRequest['prompt']['content'][number]): string[] =>
  typeof content.content === 'string'
    ? [content.content]
    : content.content.flatMap((part) => (part.type === 'text' ? [part.text] : []));

/**
 * The request a call answers: the last text of the last user message that is not a thread status line or a sibling
 * snapshot (a provider merges adjacent user messages, so those can share the request's message).
 */
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

/**
 * A fixed agent: a slow research loop of calculator calls, quick answers for the requests that arrive while it runs,
 * and a translation that waits for the research thread before it answers.
 */
const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  // Side calls (chat naming) offer no tools.
  if (!request.tools.includes(CALCULATE)) {
    return { parts: [text('Parallel threads')] };
  }
  const { text: current, index } = currentRequest(request);
  const step = toolResultsSince(request, index);
  if (current.includes('Research')) {
    if (step < 5) {
      const value = step + 5;
      return {
        delay: '9 seconds',
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
  if (current.includes('17 × 23')) {
    return { delay: '900 millis', parts: [text('17 × 23 = 391.')] };
  }
  if (current.includes('capital of Australia')) {
    return { delay: '1200 millis', parts: [text('Canberra.')] };
  }
  if (current.includes('translate')) {
    if (step === 0) {
      const sibling = /<thread id="([^"]+)" title="Research/.exec(request.text)?.[1];
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
  return { parts: [text('Done.')] };
};

/** Types a prompt into the chat editor and submits it. */
const submitPrompt = async (canvasElement: HTMLElement, value: string) => {
  const canvas = within(canvasElement);
  const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 30_000 });
  const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
  if (!editor) {
    throw new Error('Chat editor not found.');
  }
  await userEvent.click(editor);
  await userEvent.type(editor, value, { delay: 15 });
  await userEvent.keyboard('{Enter}');
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scripted (offline): the research runs on main; the three prompts sent during it start light threads. The quick ones
 * finish first, and the translation waits for the research and answers once it completes.
 */
export const Scripted: Story = {
  decorators: createDecorators({
    skills: [CalculatorSkill.key],
    scripted: script,
    assistantSettings: { parallelThreads: true },
  }),
  args: {
    layout: [[StoryRole.Chat]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, PROMPTS.research);
    await canvas.findByText(/Computing 5!/, {}, { timeout: 30_000 });
    await submitPrompt(canvasElement, PROMPTS.quick);
    await sleep(400);
    await submitPrompt(canvasElement, PROMPTS.capital);
    await sleep(400);
    await submitPrompt(canvasElement, PROMPTS.dependent);

    // The research went to the background as soon as the next prompt arrived.
    await expect(await canvas.findByTestId('chat.lane-card', {}, { timeout: 30_000 })).toBeVisible();
    await canvas.findByText(/17 × 23 = 391/, {}, { timeout: 30_000 });
    // The translation waits for the research, then answers from it.
    await canvas.findByText(/chacun est le précédent/, {}, { timeout: 60_000 });
    const headers = await canvas.findAllByTestId('chat.lane-header');
    await expect(headers.length).toBeGreaterThanOrEqual(2);
  },
};

/** The same flow against the real model: type the prompts yourself, a few seconds apart. Live AI, so not in CI. */
export const Live: Story = {
  decorators: createDecorators({
    skills: [CalculatorSkill.key],
    assistantSettings: { parallelThreads: true },
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Logging]],
  },
  tags: ['!test'],
};

/** {@link Scripted} without its play function, for a recorded walkthrough that types the prompts itself; the trace
 * panel beside the chat draws each thread as a lane of its own. */
export const Demo: Story = {
  decorators: createDecorators({
    skills: [CalculatorSkill.key],
    scripted: script,
    assistantSettings: { parallelThreads: true },
  }),
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
  },
  tags: ['!test'],
};
