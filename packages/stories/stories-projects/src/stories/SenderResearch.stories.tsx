//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { CrmPlugin } from '@dxos/plugin-crm/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';

import { StoryRole } from '../modules';
import { ModuleContainer, createDecorators, storyParameters } from '../testing';

const MAILBOX_NAME = 'Clients';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-projects/SenderResearch',
  render: ModuleContainer,
  parameters: storyParameters,
  decorators: createDecorators({
    mailboxName: MAILBOX_NAME,
    // Own the skills the template binds: crm (CrmPlugin), webSearch + database (AssistantPlugin),
    // markdown (MarkdownPlugin). A skill whose plugin is absent renders as an unnamed row.
    plugins: [CrmPlugin(), AssistantPlugin(), MarkdownPlugin()],
  }),
  args: {
    layout: [
      [
        {
          type: StoryRole.Project,
          data: {
            templateId: 'org.dxos.project.crmResearch',
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
 * The CRM research automation as a project rather than a standalone routine: the per-message
 * research routine is owned by the project, and the Person/Organization profiles and dossier
 * documents it produces are filed into the project's artifacts instead of loose in the space.
 *
 * Test:
 * 1. Click "Set up project" — the article opens, named "Sender Research — Clients".
 * 2. Skills lists CRM, Web Search, Database and Markdown; Context lists the Clients mailbox.
 * 3. Routines shows the "Sender Research" card (feed trigger, disabled).
 * 4. With a live model: enable the trigger, add a message to the mailbox feed, and watch
 *    Person/Organization cards appear in the Artifacts gallery.
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

    await waitFor(async () => expect(canvas.getByDisplayValue(/Sender Research — Clients/)).toBeInTheDocument(), {
      timeout: 30_000,
    });

    // Skill rows resolve their labels from the registry (blank if the owning plugin is unloaded).
    await waitFor(async () => expect(canvas.getByDisplayValue('CRM')).toBeInTheDocument(), { timeout: 10_000 });
    await expect(canvas.getByDisplayValue('Web Search')).toBeInTheDocument();
    await expect(canvas.getByDisplayValue('Markdown')).toBeInTheDocument();

    await expect(canvas.getByDisplayValue(MAILBOX_NAME)).toBeInTheDocument();
  },
};
