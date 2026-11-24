//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';

import { StoryRole } from '../../modules/index.ts';
import { PLANS, SAVINGS_PROMPTS, Scripts } from '../../scripts/index.ts';
import { CalculatorSkill, createDecorators, storyParameters, submitPrompt } from '../../testing/index.ts';

/**
 * Subagents on light threads: the agent delegates self-contained tasks with `thread_delegate`; each runs in a
 * background thread of its own that starts with nothing but its task, shown as a card, and only its final answer joins
 * the conversation. The agent waits for the subagents with `thread_wait` while the reader keeps chatting. For the same
 * delegation with a column per subagent instead of a card, see the ThreadColumns stories. See
 * `packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl` (F-8, QA-4).
 */
const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-assistant/threads/Subagents',
  render: ModuleContainer.Root,
  decorators: createDecorators({
    skills: [CalculatorSkill.key],
    scriptedModels: { scenes: { savingsPlans: Scripts.savingsPlans }, select: 'savingsPlans' },
    assistantSettings: { parallelThreads: true },
  }),
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Scripted (offline), for a person or a recorded walkthrough to drive, with the trace beside the chat.
 *
 * Test:
 * 1. Send "Compare three savings plans for $10,000 at 4%, 6% and 8% a year over 30 years.": a card opens in the chat
 *    for each of the three plans, and each shows its subagent working.
 * 2. Send "Meanwhile, what is 17 × 23?" while they work: the agent answers 391 at once.
 * 3. Wait: once every subagent has reported, the agent compares the three plans.
 */
export const Default: Story = {
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
  },
};

/** {@link Default} driven by a play function, without the trace: three plans are delegated and a side question answered. */
export const Scripted: Story = {
  args: {
    layout: [[StoryRole.Chat]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, SAVINGS_PROMPTS.compare);
    // Every subagent works in a card of its own.
    await waitFor(() => expect(canvas.getAllByTestId('chat.lane-card').length).toBeGreaterThanOrEqual(PLANS.length), {
      timeout: 30_000,
    });
    await submitPrompt(canvasElement, SAVINGS_PROMPTS.quick);
    await canvas.findAllByText(/17 × 23 = 391/, {}, { timeout: 30_000 });
    await canvas.findAllByText(/two extra points a year/, {}, { timeout: 120_000 });
  },
};
