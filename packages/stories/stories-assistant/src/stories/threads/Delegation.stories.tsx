//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { STORY_ARGS_UPDATED } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ScriptedScene } from '@dxos/ai/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';

import {
  type ArtifactsModuleData,
  type ChatPlaneModuleData,
  type ReplayArgs,
  type ReplayModuleData,
  StoryRole,
  type TasksModuleData,
} from '../../modules/index.ts';
import { LAUNCH_REQUEST, LAUNCH_TASKS, PLANS, SAVINGS_PROMPTS, Scripts, SIDE_QUESTION } from '../../scripts/index.ts';
import {
  CalculatorSkill,
  ReplayCache,
  createDecorators,
  launchProjectPlugins,
  seedLaunchProject,
  storyParameters,
} from '../../testing/index.ts';

/**
 * Subagents on light threads: the agent delegates self-contained tasks with `thread_delegate`; each runs in a
 * background thread of its own that starts with nothing but its task, and only its final answer joins the
 * conversation. The agent's chat stays in the first column, at the start of the strip, where each subagent also
 * shows as a card, and every active subagent has a column of its own beside it, showing its reasoning and its slice
 * of memory. A trace module beside the strip shows the processes and every thread of the whole run as one graph. A
 * subagent's column closes once it reports, and the strip scrolls sideways when the columns outgrow it. The agent
 * waits for the subagents with `thread_wait` while the reader keeps chatting.
 *
 * Two scenarios: savings plans, where three subagents each work a calculation, and the launch kit, where four each
 * write a document. See `packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl` (F-8, QA-4, QA-6).
 */
const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-assistant/threads/Delegation',
  render: ModuleContainer.Root,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The processes and every thread of the run as one graph. */
const TRACE = AppSurface.deckCompanion('trace');

/** The newest chat's thread plane: the agent's column, and one per subagent thread while it runs. */
const threadPlane = (data: Omit<ChatPlaneModuleData, 'kind'>) => ({
  type: StoryRole.ChatPlane,
  data: { kind: 'threads', ...data } satisfies ChatPlaneModuleData,
});

/** The column that is always open in the strip: the agent's chat. */
const FIXED_COLUMNS = 1;

/** Waits until exactly `subagents` subagent columns are open beside the fixed ones. */
const waitForSubagents = (canvasElement: HTMLElement, subagents: number, timeout: number) =>
  waitFor(
    () =>
      expect(canvasElement.querySelectorAll('[data-testid="chat-plane.column"]').length).toBe(
        FIXED_COLUMNS + subagents,
      ),
    { timeout },
  );

//
// Savings plans: three subagents each compute one plan with the calculator.
//

const savingsPlans: Story = {
  decorators: createDecorators({
    skills: [CalculatorSkill.key],
    scriptedModels: { scenes: { savingsPlans: Scripts.savingsPlans }, select: 'savingsPlans' },
    assistantSettings: { parallelThreads: true },
  }),
  args: {
    layout: [[threadPlane({ suggestions: [SAVINGS_PROMPTS.compare, SAVINGS_PROMPTS.quick] })], [TRACE]],
    columns: '1fr_min(32vw,40rem)',
    tiling: 'flush',
  },
};

/**
 * Savings plans, scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Click the chip that asks to compare three savings plans: a column opens beside the chat for each plan, showing
 *    its subagent working, and a card for each shows in the chat.
 * 2. Click the chip that asks what 17 × 23 is while they work: the agent answers 391 at once.
 * 3. Watch the trace beside the strip: each subagent is a lane of the one graph, and joins it when it reports.
 * 4. Wait: each subagent's column closes once it reports, and the agent compares the three plans.
 */
export const Default: Story = { ...savingsPlans };

/** {@link Default} driven by a play function: three plans are delegated and a side question answered. */
export const Scripted: Story = {
  ...savingsPlans,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: SAVINGS_PROMPTS.compare }, { timeout: 60_000 }));

    // Every subagent works in a column of its own, and shows as a card in the agent's chat.
    await waitForSubagents(canvasElement, PLANS.length, 60_000);
    await waitFor(() => expect(canvas.getAllByTestId('chat.lane-card').length).toBeGreaterThanOrEqual(PLANS.length), {
      timeout: 30_000,
    });

    // The reader keeps talking while they work.
    await userEvent.click(await canvas.findByRole('button', { name: SAVINGS_PROMPTS.quick }, { timeout: 30_000 }));
    await canvas.findAllByText(/17 × 23 = 391/, {}, { timeout: 30_000 });

    // Every column closes once its subagent reports, and the comparison lands in the agent's chat.
    await canvas.findAllByText(/two extra points a year/, {}, { timeout: 120_000 });
    await waitForSubagents(canvasElement, 0, 60_000);
  },
};

//
// Launch kit: four subagents each write a document.
//

const launchKit: Story = {
  decorators: createDecorators({
    onChatCreated: seedLaunchProject,
    lazyPlugins: launchProjectPlugins,
    skills: [MarkdownSkill.key, PlanningSkill.key],
    scriptedModels: { scenes: { launchKit: Scripts.launchKit }, select: 'launchKit' },
    assistantSettings: { parallelThreads: true, parallelThreadLimit: 6 },
  }),
  args: {
    // A chat column wide on the left: the project's tasks, the trace, and the documents the subagents write.
    layout: [
      [
        { type: StoryRole.Tasks, data: { source: 'project' } satisfies TasksModuleData },
        TRACE,
        { type: StoryRole.Artifacts, data: { view: 'cards' } satisfies ArtifactsModuleData },
      ],
      [
        threadPlane({
          suggestions: [LAUNCH_REQUEST, SIDE_QUESTION],
          // Open from the start, so the agent's checklist is seen ticking off as subagents report.
          defaultDrawer: 'tasks',
        }),
      ],
    ],
    columns: 'min(32vw,40rem)_1fr',
    tiling: 'flush',
  },
};

/**
 * Launch kit, scripted (offline), for a person or a recorded walkthrough to drive.
 *
 * Test:
 * 1. Look left: the project's task list holds the four launch tasks.
 * 2. Click the chip that asks for the Composer 1.0 launch kit: a column opens beside the chat for each of the four
 *    documents, and the chat's own column stays where it was.
 * 3. Scroll the strip sideways to reach the columns past the edge.
 * 4. Click the chip that asks which day to launch: the chat answers while the subagents keep working.
 * 5. Wait: each column closes once its subagent reports, its document appears as a card at the bottom of the left
 *    column, and the summary lands in the chat's column.
 */
export const LaunchKit: Story = { ...launchKit };

/** {@link LaunchKit} driven by a play function: the launch kit is delegated, a side question is answered meanwhile. */
export const LaunchKitScripted: Story = {
  ...launchKit,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: LAUNCH_REQUEST }, { timeout: 60_000 }));

    // A column per subagent opens beside the chat's.
    await waitForSubagents(canvasElement, LAUNCH_TASKS.length, 60_000);

    // The reader keeps talking while they work; the reply comes once the agent's current wait returns.
    await userEvent.click(await canvas.findByRole('button', { name: SIDE_QUESTION }, { timeout: 30_000 }));
    await canvas.findAllByText(/Tuesday the 18th/, {}, { timeout: 90_000 });

    // Every subagent's column closes once it reports, and the summary lands in the chat's column with each document.
    await waitForSubagents(canvasElement, 0, 120_000);
    await canvas.findAllByText(/The launch kit is ready/, {}, { timeout: 60_000 });
    for (const { document } of LAUNCH_TASKS) {
      await canvas.findAllByText(document, { exact: false });
    }
  },
};

/** What the recorded launch kit depends on; a change to any of it records the run again. */
const launchKitReplay = {
  scene: ScriptedScene.withoutDelays(Scripts.launchKit),
  prompts: [LAUNCH_REQUEST, SIDE_QUESTION],
  assistantSettings: { parallelThreads: true, parallelThreadLimit: 6 },
};

const launchKitCache = new ReplayCache('threads/Delegation/LaunchKitReplay', launchKitReplay);

/**
 * The launch kit, scripted with no delays and run to its end, then stepped through one trajectory event at a time: the
 * chat shows what the live chat showed when that event landed. The finished space is kept in IndexedDB, so a reload
 * imports it rather than running again; the step and the bookmarks are story args, so they persist in the URL.
 *
 * Test:
 * 1. Wait for the run to finish: the toolbar shows the last step and the chat shows the whole conversation.
 * 2. Press ← and →, or the toolbar buttons: the thread grows and shrinks one event at a time.
 * 3. Press Home: the thread empties; press End: it is whole again.
 * 4. Bookmark a step, move away, and click its chip: the chat returns to it.
 * 5. Reload the page: the replay opens at once, at the step and with the bookmarks from the URL.
 * 6. Click Re-record: the recording is dropped and the run records again.
 */
export const LaunchKitReplay: StoryObj<ReplayArgs> = {
  // Declared so Storybook reads them back from the URL, which only accepts args it has a control for.
  argTypes: {
    step: { control: { type: 'number', min: 0 } },
    bookmarks: { control: 'object' },
  },
  // Tells the manager the new args, which it writes to the URL, without updating them in the preview: an arg update
  // reboots the whole harness (a new space), which would start the run again.
  render: (args, { id }) => (
    <ModuleContainer.Root
      layout={[
        [
          {
            type: StoryRole.Replay,
            data: {
              cache: launchKitCache,
              prompts: launchKitReplay.prompts,
              initial: args,
              onChange: (next) =>
                addons.getChannel().emit(STORY_ARGS_UPDATED, { storyId: id, args: { ...args, ...next } }),
            } satisfies ReplayModuleData,
          },
        ],
      ]}
      tiling='flush'
    />
  ),
  decorators: createDecorators({
    onChatCreated: seedLaunchProject,
    lazyPlugins: launchProjectPlugins,
    skills: [MarkdownSkill.key, PlanningSkill.key],
    scriptedModels: { scenes: { launchKit: launchKitReplay.scene }, select: 'launchKit' },
    assistantSettings: launchKitReplay.assistantSettings,
  }),
};
