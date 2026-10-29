//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import * as Panel from '@dxos/react-ui/Panel';

import { StoryRole, StorySettingsToolbar } from '../modules/index.ts';
import {
  type DiscordBotArgs,
  type FakeDiscordBot,
  ModuleContainer,
  type ModuleLayout,
  createDecorators,
  edgeFake,
  installFakeDiscordBot,
  setupAgent,
  setupDiscordAgent,
  storyConfig,
  storyParameters,
} from '../testing/index.ts';

type StoryArgs = DiscordBotArgs & {
  layout?: ModuleLayout;
  /** Keeps the profile (space, bindings, conversations) across reloads; a change reboots the story. */
  persistent?: boolean;
};

const meta: Meta<StoryArgs> = {
  title: 'stories/stories-agent/DiscordAgent',
  render: ModuleContainer,
  // The bot monitor renders `@dxos/react-ui-debug`'s Logger, so its namespace must be registered.
  parameters: { ...storyParameters, translations: [...storyParameters.translations, ...debugTranslations] },
};

export default meta;

const companion = (variant: string) => ({
  type: StoryRole.AgentCompanion,
  data: { variant },
  id: `companion-${variant}`,
});

type Story = StoryObj<StoryArgs>;

/**
 * Installing the DXOS Discord app (Kai) and routing a Discord channel to the agent, in a durable test space on a
 * local EDGE stack. Setup: the package README (Discord portal, 1Password, local EDGE, Chrome).
 *
 * Try:
 * 1. Discord: **Connect Discord** signs you in (the servers you administer appear).
 * 2. Pick a server without the bot and **Install** it (Discord's consent page), then **Refresh**.
 * 3. Pick the server, and **Connect** a channel: it appears in Activity -> Channels.
 * 4. Activity: **Connect channels** starts the bot; the Discord bot panel reaches ready.
 * 5. Mention @Kai in that channel: the conversation appears under Activity -> Conversations.
 * 6. Reload: the space, the binding and the conversation are still there.
 */
export const Setup: Story = {
  render: (args) => (
    <Panel.Root>
      <Panel.Header>
        <StorySettingsToolbar />
      </Panel.Header>
      {/* `ModuleContainer` pins itself to its nearest positioned ancestor, so the body is that ancestor. */}
      <Panel.Body classNames='relative'>
        <ModuleContainer {...args} />
      </Panel.Body>
    </Panel.Root>
  ),
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    config: storyConfig({ persistent: args.persistent }),
    onReady: async ({ db, invoker }) => {
      await setupAgent({ db, invoker, remote: true });
    },
  })),
  argTypes: { persistent: { control: 'boolean' } },
  args: {
    persistent: true,
    layout: [
      [companion('discord'), StoryRole.DiscordBot],
      [StoryRole.AgentProperties, companion('email')],
      [companion('activity'), StoryRole.Conversation],
      [companion('brain')],
    ],
  },
  tags: ['!test'],
};

let fakeBot: FakeDiscordBot | undefined;

/** Waits for a monitor row containing `text`, reporting the timeline if it never appears. */
const findEntry = (monitor: HTMLElement, text: string) =>
  waitFor(
    () => {
      // The monitor is a `Logger.List`, whose rows are listbox options.
      const rows = within(monitor).queryAllByRole('option');
      if (!rows.some((row) => row.textContent?.includes(text))) {
        throw new Error(
          `"${text}" never appeared; the timeline shows: ${rows.map((row) => row.textContent).join(' | ')}`,
        );
      }
    },
    { timeout: 30_000, interval: 250 },
  );

/**
 * The bot's lifecycle against a fake EDGE bot host (`installFakeDiscordBot`): Activity's Connect channels sends the
 * channel and its config to EDGE, the gateway goes connecting -> ready, Disconnect closes it, and the monitor records
 * each step.
 */
export const Scripted: Story = {
  beforeEach: () => {
    fakeBot = installFakeDiscordBot();
    return () => {
      fakeBot?.restore();
      fakeBot = undefined;
    };
  },
  decorators: createDecorators({
    config: edgeFake,
    onReady: async ({ db, invoker }) => {
      await setupDiscordAgent({ db, invoker, applicationId: '1234567890', channelId: '987654321', guildId: '555' });
    },
  }),
  args: { layout: [[StoryRole.DiscordBot], [companion('activity')], [companion('brain')]] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const monitor = await canvas.findByTestId('discord-bot-monitor', {}, { timeout: 60_000 });
    await findEntry(monitor, 'stopped · idle');
    // Setup put the agent in Support mode after the Activity panel mounted, so its skill list must follow the bindings.
    const skills = await canvas.findByRole('group', { name: 'Skills' }, { timeout: 30_000 });
    await within(skills).findByText('Community support', {}, { timeout: 30_000 });
    // Setup recorded each team member's expertise, which the skill reads to choose who to offer.
    await canvas.findByText(/Dmytro knows about ECHO/, {}, { timeout: 30_000 });

    await userEvent.click(await canvas.findByRole('button', { name: 'Connect channels' }, { timeout: 30_000 }));
    await findEntry(monitor, 'running · connecting');
    await findEntry(monitor, 'running · ready');
    const start = fakeBot?.calls.find(({ method }) => method === 'PUT');
    await expect(start?.applicationId).toBe('1234567890');
    await expect(start?.body).toMatchObject({
      binding: expect.stringContaining('/'),
      channel: expect.stringContaining('/'),
    });

    await userEvent.click(await canvas.findByRole('button', { name: 'Disconnect channels' }));
    await findEntry(monitor, 'stopped · closed');
  },
};
