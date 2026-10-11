//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { StoryRole } from '../modules/index.ts';
import {
  type DiscordBotArgs,
  type FakeDiscordBot,
  KAI_APPLICATION_ID,
  ModuleContainer,
  type ModuleLayout,
  createDecorators,
  edgeFake,
  edgeLocalPersistent,
  ensureBotRecord,
  installFakeDiscordBot,
  setupAgent,
  setupDiscordAgent,
  storyParameters,
} from '../testing/index.ts';

type StoryArgs = DiscordBotArgs & { layout?: ModuleLayout };

const meta: Meta<StoryArgs> = {
  title: 'stories/stories-agent/AgentDiscord',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<StoryArgs>;

const companion = (variant: string) => ({
  type: StoryRole.AgentCompanion,
  data: { variant },
  id: `companion-${variant}`,
});

/**
 * Installing the DXOS Discord app (Kai) and routing a Discord channel to the agent, in a durable test space on a
 * local EDGE stack. Setup: the package README (Discord portal, 1Password, local EDGE, Chrome).
 *
 * Try:
 * 1. Discord: **Connect Discord** signs you in (the servers you administer appear).
 * 2. Pick a server without the bot and **Install** it (Discord's consent page), then **Refresh**.
 * 3. Pick the server, and **Connect** a channel: it appears in Activity → Channels.
 * 4. Mention @Kai in that channel: the conversation appears under Activity → Conversations.
 * 5. Reload: the space, the binding and the conversation are still there.
 */
export const Setup: Story = {
  decorators: createDecorators({
    config: edgeLocalPersistent,
    onReady: async ({ db, invoker }) => {
      await setupAgent({ db, invoker, remote: true });
      await ensureBotRecord(db, KAI_APPLICATION_ID);
    },
  }),
  args: {
    layout: [[companion('discord')], [companion('activity')], [StoryRole.DiscordBot], [companion('brain')]],
  },
  tags: ['!test'],
};

let fakeBot: FakeDiscordBot | undefined;

/** Waits for a monitor row containing `text`, reporting the timeline if it never appears. */
const findEntry = (monitor: HTMLElement, text: string) =>
  waitFor(
    () => {
      const rows = within(monitor).queryAllByTestId('discord-bot-monitor-entry');
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
 * channel and its config to EDGE, the gateway goes connecting → ready, Disconnect closes it, and the monitor records
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
  args: { layout: [[companion('activity')], [StoryRole.DiscordBot], [companion('brain')]] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const monitor = await canvas.findByTestId('discord-bot-monitor', {}, { timeout: 60_000 });
    await findEntry(monitor, 'stopped · idle');
    // Setup put the agent in Support mode after the Activity panel mounted, so its skill list must follow the bindings.
    const skills = await canvas.findByRole('region', { name: 'Skills' }, { timeout: 30_000 });
    await within(skills).findByText('Community support', {}, { timeout: 30_000 });
    // Setup recorded each team member's expertise, which the skill reads to choose who to offer.
    await canvas.findByText(/Dmytro Maretskyi \(DXOS\) is the one to ask about ECHO/, {}, { timeout: 30_000 });

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
