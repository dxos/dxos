//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { BrainPlugin } from '@dxos/plugin-brain/plugin';

import { StoryRole } from '../modules';
import { ModuleContainer, createDecorators, storyParameters } from '../testing';

const MAILBOX_NAME = 'Work';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-projects/FactSummaries',
  render: ModuleContainer,
  parameters: storyParameters,
  decorators: createDecorators({
    mailboxName: MAILBOX_NAME,
    // Owns `org.dxos.skill.brain` plus the per-space FactStore the analysis routine writes into.
    plugins: [BrainPlugin()],
  }),
  args: {
    layout: [
      [
        {
          type: StoryRole.Project,
          data: {
            templateId: 'org.dxos.project.mailboxFacts',
          },
        },
      ],
      [StoryRole.Logging],
    ],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A project whose memory is the space fact store. Its starter routine is an *operation* action, not
 * a prompt: the trigger fires `AnalyzeMailbox` directly with the mailbox baked into its input, so
 * extraction runs as a deterministic pipeline with no model in the trigger loop. Chats in the
 * project then answer "where things stand" questions from the extracted facts via the brain skill,
 * citing the source messages, instead of re-reading the mailbox.
 *
 * Test (steps 3-4 need a live model — ollama via the brain settings, or EDGE):
 * 1. Click "Set up project" — the article opens, named "Mailbox Facts — Work".
 * 2. Context lists the Work mailbox; Routines shows "Analyze Mailbox" (scheduled, disabled).
 * 3. Seed messages into the mailbox, run Analyze from the mailbox toolbar (or enable the trigger),
 *    and confirm facts appear in the mailbox's Facts companion.
 * 4. Open a project chat and ask "summarize where things stand with <sender>" — the reply is
 *    grounded in the facts and cites the messages they came from.
 */
export const Default: Story = {};

/**
 * Drives the template through the real operation stack and asserts the article it produces.
 *
 * The Routines gallery is NOT asserted: its masonry renders nothing in this harness even though the
 * template links the routine (covered by the template's own unit test), so a DOM assertion here
 * would fail for a reason unrelated to what the story demonstrates. Tracked in
 * plugin-projects/TASKS.md.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await waitFor(() => canvas.getByTestId('projects.story.setup'), { timeout: 30_000 });
    await userEvent.click(button);

    await waitFor(async () => expect(canvas.getByDisplayValue(/Mailbox Facts — Work/)).toBeInTheDocument(), {
      timeout: 30_000,
    });

    // Skill rows resolve their labels from the registry (blank if the owning plugin is unloaded).
    await waitFor(async () => expect(canvas.getByDisplayValue('Brain')).toBeInTheDocument(), { timeout: 10_000 });
    await expect(canvas.getByDisplayValue('Inbox')).toBeInTheDocument();

    await expect(canvas.getByDisplayValue(MAILBOX_NAME)).toBeInTheDocument();
  },
};
