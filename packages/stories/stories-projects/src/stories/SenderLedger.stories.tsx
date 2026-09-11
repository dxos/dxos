//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as TablePlugin from '@dxos/plugin-table/TablePlugin';

import { StoryRole } from '../modules/index.ts';
import { ModuleContainer, createDecorators, storyParameters } from '../testing/index.ts';

const MAILBOX_NAME = 'Work';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-projects/SenderLedger',
  render: ModuleContainer,
  parameters: storyParameters,
  decorators: createDecorators({
    mailboxName: MAILBOX_NAME,
    // Owns `org.dxos.skill.table`, which the template binds and the ledger routine writes through.
    plugins: [TablePlugin.make()],
  }),
  args: {
    layout: [
      [
        {
          type: StoryRole.Project,
          data: {
            templateId: 'org.dxos.project.inboxResearch',
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
 * Setting up an Inbox Research project from a mailbox: the template binds the mailbox as standing
 * context, adds the inbox and table skills, and scaffolds a feed-triggered "Sender Ledger" routine
 * that maintains a table of senders (email, name, message count, last seen) as mail arrives.
 *
 * Test:
 * 1. Click "Set up project" — the project article opens, named "Inbox Research — Work".
 * 2. Instructions shows the seeded brief; Skills lists Inbox and Table.
 * 3. Context lists the Work mailbox — the project's inputs, distinct from the empty Artifacts
 *    gallery below (its outputs).
 * 4. Routines shows the "Sender Ledger" card summarizing its feed trigger; it stays disabled until
 *    enabled, so opening the story runs no model.
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
    // Client init (identity + space + indexed flush) gates the first render.
    const button = await waitFor(() => canvas.getByTestId('projects.story.setup'), { timeout: 30_000 });
    await userEvent.click(button);

    await waitFor(async () => expect(canvas.getByDisplayValue(/Inbox Research — Work/)).toBeInTheDocument(), {
      timeout: 30_000,
    });

    // Skill rows resolve their labels from the registry (blank if the owning plugin is unloaded).
    await waitFor(async () => expect(canvas.getByDisplayValue('Table')).toBeInTheDocument(), { timeout: 10_000 });
    await expect(canvas.getByDisplayValue('Inbox')).toBeInTheDocument();

    // Standing context (the mailbox) and the starter routine.
    await expect(canvas.getByDisplayValue(MAILBOX_NAME)).toBeInTheDocument();
    await expect(canvas.getByText('Context')).toBeInTheDocument();
    await expect(canvas.getByText('Artifacts')).toBeInTheDocument();
  },
};
