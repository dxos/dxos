//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ThreadColumns } from '../../components/index.ts';
import { PLANS, SAVINGS_PROMPTS, Scripts } from '../../scripts/index.ts';
import { CalculatorSkill, createDecorators, storyParameters } from '../../testing/index.ts';

type StoryArgs = {
  /** Prompts offered as chips above the composer, one at a time, in the order they are meant to be sent. */
  suggestions?: readonly string[];
};

/**
 * Subagents on light threads: the agent delegates self-contained tasks with `thread_delegate`; each runs in a
 * background thread of its own that starts with nothing but its task, and only its final answer joins the
 * conversation. The agent's chat stays in the first column, where each subagent also shows as a card, and every
 * active subagent has a column of its own beside it, which closes once the subagent reports. The agent waits for the
 * subagents with `thread_wait` while the reader keeps chatting. For subagents that write documents, see the
 * ThreadColumns stories. See `packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl` (F-8, QA-4).
 */
const meta: Meta<StoryArgs> = {
  title: 'stories/stories-assistant/threads/Subagents',
  component: ThreadColumns,
  decorators: createDecorators({
    skills: [CalculatorSkill.key],
    scriptedModels: { scenes: { savingsPlans: Scripts.savingsPlans }, select: 'savingsPlans' },
    assistantSettings: { parallelThreads: true },
  }),
  parameters: storyParameters,
  args: {
    suggestions: [SAVINGS_PROMPTS.compare, SAVINGS_PROMPTS.quick],
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

const COLUMN = '[data-testid="chat-plane.column"]';

/**
 * Scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Click the chip that asks to compare three savings plans: a column opens beside the chat for each plan, showing
 *    its subagent working, and a card for each shows in the chat.
 * 2. Click the chip that asks what 17 × 23 is while they work: the agent answers 391 at once.
 * 3. Wait: each column closes once its subagent reports, and the agent compares the three plans.
 */
export const Default: Story = {};

/** {@link Default} driven by a play function: three plans are delegated and a side question answered. */
export const Scripted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: SAVINGS_PROMPTS.compare }, { timeout: 60_000 }));

    // Every subagent works in a column of its own, and shows as a card in the agent's chat.
    await waitFor(() => expect(canvasElement.querySelectorAll(COLUMN).length).toBe(1 + PLANS.length), {
      timeout: 60_000,
    });
    await waitFor(() => expect(canvas.getAllByTestId('chat.lane-card').length).toBeGreaterThanOrEqual(PLANS.length), {
      timeout: 30_000,
    });

    // The reader keeps talking while they work.
    await userEvent.click(await canvas.findByRole('button', { name: SAVINGS_PROMPTS.quick }, { timeout: 30_000 }));
    await canvas.findAllByText(/17 × 23 = 391/, {}, { timeout: 30_000 });

    // Every column closes once its subagent reports, and the comparison lands in the agent's chat.
    await canvas.findAllByText(/two extra points a year/, {}, { timeout: 120_000 });
    await waitFor(() => expect(canvasElement.querySelectorAll(COLUMN).length).toBe(1), { timeout: 60_000 });
  },
};
