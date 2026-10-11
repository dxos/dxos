//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import * as AgentPlugin from '@dxos/plugin-agent/AgentPlugin';
import * as Goal from '@dxos/plugin-agent/Goal';
import * as Memory from '@dxos/plugin-agent/Memory';
import * as Mode from '@dxos/plugin-agent/Mode';
import * as Relay from '@dxos/plugin-agent/Relay';
import { translations as agentTranslations } from '@dxos/plugin-agent/translations';
import * as DiscordChannel from '@dxos/plugin-discord/DiscordChannel';
import * as DiscordPlugin from '@dxos/plugin-discord/DiscordPlugin';
import { translations as discordTranslations } from '@dxos/plugin-discord/translations';
import * as ThreadPlugin from '@dxos/plugin-thread/ThreadPlugin';
import { HasSubject, Organization, Person, ProfileOf } from '@dxos/types';

import { StoryRole } from '../modules/index.ts';
import {
  type DiscordBotArgs,
  type FakeDiscordBot,
  ModuleContainer,
  type ModuleLayout,
  config,
  createDecorators,
  installFakeDiscordBot,
  setupDiscordAgent,
  storyParameters,
} from '../testing/index.ts';

type StoryArgs = DiscordBotArgs & { layout?: ModuleLayout };

const meta: Meta<StoryArgs> = {
  title: 'stories/stories-assistant/AgentDiscord',
  render: ModuleContainer,
  parameters: {
    ...storyParameters,
    translations: [...storyParameters.translations, ...agentTranslations, ...discordTranslations],
  },
  argTypes: {
    applicationId: { control: 'text', description: 'Discord application (bot) id.' },
    channelId: { control: 'text', description: 'Discord channel the bot listens in.' },
    guildId: { control: 'text', description: 'Discord server (guild) id.' },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

const TYPES = [
  Person.Person,
  Organization.Organization,
  HasSubject.HasSubject,
  Memory.Memory,
  Goal.Goal,
  Mode.Mode,
  Relay.Relay,
  ProfileOf.ProfileOf,
  AgentChannels.AgentChannels,
  DiscordChannel.DiscordChannel,
];

/** The bot's controls and conversations, its status timeline, the newest conversation, and what the agent knows. */
const LAYOUT: ModuleLayout = [
  [StoryRole.AgentActivity],
  [StoryRole.DiscordBot],
  [StoryRole.Chat],
  [StoryRole.AgentState, StoryRole.AgentKnowledge],
];

const plugins = () => [ThreadPlugin.make(), DiscordPlugin.make(), AgentPlugin.make()];

/**
 * Kai bound to a Discord channel whose bot runs on a local EDGE stack (`:8787`, see plugin-agent's
 * `docs/SETUP.md`); EDGE substitutes `DISCORD_BOT_TOKEN_DEV` for the space's placeholder token. The ids
 * default to Kai's bot and the DXOS #test-bot channel (change them in Controls); press **Start bot** in the
 * Activity panel, then mention the bot in the Discord channel: the thread's conversation appears under
 * Conversations, in the chat panel, and the monitor records each gateway transition. Live, so excluded from CI.
 */
export const Live: Story = {
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    config: config.edgeLocal,
    plugins: plugins(),
    types: TYPES,
    onReady: async ({ db, invoker }) => {
      await setupDiscordAgent({ db, invoker, ...args, remote: true });
    },
  })),
  // Kai's bot and the DXOS server's #test-bot channel.
  args: {
    layout: LAYOUT,
    applicationId: '1555777706459660288',
    channelId: '1494842957340086382',
    guildId: '837138313172353095',
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
 * {@link Live} against a fake EDGE bot host (`installFakeDiscordBot`): Start sends the channel and its
 * config to EDGE, the gateway goes connecting → ready, Stop closes it, and the monitor records each step.
 */
export const Scripted: Story = {
  beforeEach: () => {
    fakeBot = installFakeDiscordBot();
    return () => {
      fakeBot?.restore();
      fakeBot = undefined;
    };
  },
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    plugins: plugins(),
    types: TYPES,
    onReady: async ({ db, invoker }) => {
      await setupDiscordAgent({ db, invoker, ...args });
    },
  })),
  args: { layout: LAYOUT, applicationId: '1234567890', channelId: '987654321', guildId: '555' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const monitor = await canvas.findByTestId('discord-bot-monitor', {}, { timeout: 60_000 });
    await findEntry(monitor, 'stopped · idle');

    await userEvent.click(await canvas.findByRole('button', { name: 'Start bot' }, { timeout: 30_000 }));
    await findEntry(monitor, 'running · ready');
    const start = fakeBot?.calls.find(({ method }) => method === 'PUT');
    await expect(start?.applicationId).toBe('1234567890');
    await expect(start?.body).toMatchObject({
      binding: expect.stringContaining('/'),
      channel: expect.stringContaining('/'),
    });

    await userEvent.click(await canvas.findByRole('button', { name: 'Stop bot' }));
    await findEntry(monitor, 'stopped · closed');
  },
};
