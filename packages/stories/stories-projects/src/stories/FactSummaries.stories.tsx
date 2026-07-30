//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { BrainPlugin } from '@dxos/plugin-brain/plugin';

import { StoryRole } from '../modules';
import { ModuleContainer, createDecorators, storyParameters } from '../testing';

const MAILBOX_NAME = 'Work';
const TEMPLATE_ID = 'org.dxos.project.mailboxFacts';

/** Owns `org.dxos.skill.brain`, the per-space FactStore, and the mailbox toolbar's `Analyze` action. */
const plugins = [BrainPlugin()];

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-projects/FactSummaries',
  render: ModuleContainer,
  parameters: storyParameters,
  // Scaffold-only set: no seeded mail, no AI service. Seeding either pushes client init past the
  // play-test budget, so the runnable configuration lives on `Live` below.
  decorators: createDecorators({ mailboxName: MAILBOX_NAME, plugins }),
  args: {
    layout: [[{ type: StoryRole.Project, data: { templateId: TEMPLATE_ID } }], [StoryRole.Logging]],
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
 * Scaffolding only — see `Live` to run the extraction.
 *
 * Test:
 * 1. Click "Set up project" — the article opens, named "Mailbox Facts — Work".
 * 2. Context lists the Work mailbox; Routines shows "Analyze Mailbox" (scheduled, disabled).
 */
export const Default: Story = {};

/**
 * The same project with the loop actually runnable: the harness seeds mail and a local model, and
 * the mailbox panel beside the article carries plugin-brain's `Analyze` action, so extraction is a
 * click rather than a manual setup.
 *
 * Out of CI (`!test`) — it needs a local model, and seeding mail alone exceeds the play-test budget.
 *
 * Test (needs `OLLAMA_ORIGINS="*" ollama serve`):
 * 1. Click "Set up project" — the article opens, named "Mailbox Facts — Work".
 * 2. In the mailbox panel, run `Analyze` from the toolbar and wait for it to settle.
 * 3. Facts appear in the mailbox's Facts companion, attributed to the messages they came from.
 * 4. Open a project chat and ask "summarize where things stand with <sender>" — the reply is
 *    grounded in those facts rather than a re-read of the mailbox.
 */
export const Live: Story = {
  tags: ['!test'],
  decorators: createDecorators({
    mailboxName: MAILBOX_NAME,
    // Few threads means senders repeat across messages, which is what makes aggregation visible.
    messages: { count: 12, threads: 3 },
    ai: 'ollama',
    plugins,
  }),
  args: {
    layout: [
      [{ type: StoryRole.Project, data: { templateId: TEMPLATE_ID } }],
      [StoryRole.Mailbox],
      [StoryRole.Logging],
    ],
  },
};

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
