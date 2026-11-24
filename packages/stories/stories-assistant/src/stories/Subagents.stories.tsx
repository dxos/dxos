//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';

import { StoryRole } from '../modules/index.ts';
import { PLANS, SAVINGS_PROMPTS, Scripts } from '../scripts/index.ts';
import { CalculatorSkill, createDecorators, storyParameters, submitPrompt } from '../testing/index.ts';

/**
 * Subagents on light threads: the agent delegates self-contained tasks with `thread_delegate`; each runs in a
 * background thread of its own that starts with nothing but its task, shown as a card, and only its final answer joins
 * the conversation. The agent waits for the subagents with `thread_wait` while the reader keeps chatting. See
 * `packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl` (F-8).
 */
const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-assistant/Subagents',
  render: ModuleContainer.Root,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

const decorators = createDecorators({
  skills: [CalculatorSkill.key],
  scriptedModels: { scenes: { savingsPlans: Scripts.savingsPlans }, select: 'savingsPlans' },
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

/** {@link Scripted} without its play function, for a recorded walkthrough that types the prompts itself. */
export const Demo: Story = {
  decorators,
  args: {
    layout: [[StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
  },
  tags: ['!test'],
};
