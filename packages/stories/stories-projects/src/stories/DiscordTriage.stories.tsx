//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Project from '@dxos/compute/Project';
import { Feed } from '@dxos/echo';
import { Cell } from '@dxos/storybook-testing';
import { Outline, Task, TaskSet } from '@dxos/types';

import { CHANNEL_FEED_NAME, type ChannelTriageModuleProps, StoryRole } from '../modules/index.ts';
import { ModuleContainer, createDecorators, storyParameters } from '../testing/index.ts';

/** A space with the synced channel's feed and the project triage files into, laid out side by side. */
const decorators = (pace: ChannelTriageModuleProps) =>
  createDecorators({
    mailboxName: 'Inbox',
    types: [Task.Task, TaskSet.TaskSet, Outline.Outline],
    seed: async (space) => {
      space.db.add(Feed.make({ name: CHANNEL_FEED_NAME, namespace: 'data' }));
      const project = space.db.add(Project.make({ name: 'DXOS Community' }));
      await space.db.flush({ indexes: true });
      return [[{ type: StoryRole.ChannelTriage, data: pace }], [Cell.article(project)]];
    },
  });

/**
 * The DXOS Discord #general channel, replayed from a recording, triaged into a project as each message
 * arrives: a question becomes a "Reply to" task carrying a drafted reply for someone to review, and the
 * work a message asks for becomes a task. Runs offline: the model is scripted (`TriageModel`).
 *
 * Try: click **Replay channel** and watch the project's task list fill in beside the channel.
 */
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-projects/DiscordTriage',
  render: ModuleContainer,
  parameters: storyParameters,
  args: { columns: '2fr_3fr' },
};

export default meta;

type Story = StoryObj<typeof meta>;

// Decorators per story rather than on the meta: Storybook stacks a story's decorators on the meta's.
export const Default: Story = {
  decorators: decorators({ paceMs: 1_200, thinkMs: 700 }),
};

/** Replays the channel at full speed and checks what the project receives. */
export const Test: Story = {
  decorators: decorators({ paceMs: 0, thinkMs: 0 }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const play = await canvas.findByTestId('channel-triage.play', undefined, { timeout: 30_000 });
    await waitFor(() => expect(play).toBeEnabled(), { timeout: 30_000 });
    await userEvent.click(play);

    await waitFor(
      () => expect(canvas.getByTestId('channel-triage.totals')).toHaveTextContent('2 replies drafted · 4 tasks'),
      {
        timeout: 30_000,
      },
    );
    await waitFor(() => expect(canvas.getAllByText(/Write a guide to customizing storage/)[0]).toBeInTheDocument(), {
      timeout: 10_000,
    });
    await expect(canvas.getAllByText(/No action/).length).toBe(5);
  },
};
