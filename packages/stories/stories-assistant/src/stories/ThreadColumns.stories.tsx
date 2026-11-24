//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';

import { ThreadColumns } from '../components/index.ts';
import { LAUNCH_REQUEST, LAUNCH_TASKS, Scripts, SIDE_QUESTION } from '../scripts/index.ts';
import { createDecorators, storyParameters } from '../testing/index.ts';

type StoryArgs = {
  /** Prompts offered as chips above the composer, one at a time, in the order they are meant to be sent. */
  suggestions?: readonly string[];
};

/**
 * One chat and the threads it delegates: the chat stays in the first column, at the start of the strip, with its
 * prompt beneath it, and each subagent thread opens in a column of its own beside it, showing its reasoning, the
 * document it writes and its slice of memory. A column closes once its subagent reports, and the strip scrolls
 * sideways when the columns outgrow it. For a column per chat, see the ChatColumns stories. See
 * `packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl` (F-8, QA-6).
 */
const meta: Meta<StoryArgs> = {
  title: 'stories/stories-assistant/ThreadColumns',
  component: ThreadColumns,
  decorators: createDecorators({
    lazyPlugins: async () => {
      const SpacePlugin = await import('@dxos/plugin-space/SpacePlugin');
      // Files the documents the subagents create.
      return { plugins: [SpacePlugin.make({})] };
    },
    skills: [MarkdownSkill.key, PlanningSkill.key],
    scriptedModels: { scenes: { launchKit: Scripts.launchKit }, select: 'launchKit' },
    assistantSettings: { parallelThreads: true, parallelThreadLimit: 6 },
  }),
  parameters: storyParameters,
  args: {
    suggestions: [LAUNCH_REQUEST, SIDE_QUESTION],
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** Waits until exactly `count` columns, the chat's and its subagents', are open. */
const waitForColumns = (canvasElement: HTMLElement, count: number, timeout: number) =>
  waitFor(() => expect(canvasElement.querySelectorAll('[data-testid="chat-plane.column"]').length).toBe(count), {
    timeout,
  });

/**
 * Scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Click the chip that asks for the Composer 1.0 launch kit: a column opens beside the chat for each of the four
 *    documents, and the chat's own column stays where it was.
 * 2. Scroll the strip sideways to reach the columns past the edge.
 * 3. Click the chip that asks which day to launch: the chat answers while the subagents keep working.
 * 4. Wait: each column closes once its subagent reports, and the summary lands in the chat's column.
 */
export const Default: Story = {};

/** {@link Default} driven by a play function: the launch kit is delegated, a side question is answered meanwhile. */
export const Scripted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: LAUNCH_REQUEST }, { timeout: 60_000 }));

    // A column per subagent opens beside the chat's.
    await waitForColumns(canvasElement, 1 + LAUNCH_TASKS.length, 60_000);

    // The reader keeps talking while they work; the reply comes once the agent's current wait returns.
    await userEvent.click(await canvas.findByRole('button', { name: SIDE_QUESTION }, { timeout: 30_000 }));
    await canvas.findAllByText(/Tuesday the 18th/, {}, { timeout: 90_000 });

    // Every subagent's column closes once it reports, and the summary lands in the chat's column with each document.
    await waitForColumns(canvasElement, 1, 120_000);
    await canvas.findAllByText(/The launch kit is ready/, {}, { timeout: 60_000 });
    for (const { document } of LAUNCH_TASKS) {
      await canvas.findAllByText(document, { exact: false });
    }
  },
};
