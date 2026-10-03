//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { waitFor, within } from 'storybook/test';

import * as Chat from '@dxos/assistant/Chat';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import * as AgentPlugin from '@dxos/plugin-agent/AgentPlugin';
import * as FactEntry from '@dxos/plugin-agent/FactEntry';
import * as Goal from '@dxos/plugin-agent/Goal';
import * as Memory from '@dxos/plugin-agent/Memory';
import * as Mode from '@dxos/plugin-agent/Mode';
import * as Relay from '@dxos/plugin-agent/Relay';
import { translations as agentTranslations } from '@dxos/plugin-agent/translations';
import * as ProfileOf from '@dxos/plugin-crm/ProfileOf';
import { HasSubject, Message, Organization, Person } from '@dxos/types';

import { StoryRole } from '../modules/index.ts';
import {
  ModuleContainer,
  type Participant,
  PARTICIPANTS,
  PLAYGROUND_MODEL,
  type PlaygroundRefs,
  createDecorators,
  setupPlayground,
  storyParameters,
  submitPrompt,
} from '../testing/index.ts';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/AgentConversation',
  render: ModuleContainer,
  parameters: {
    ...storyParameters,
    translations: [...storyParameters.translations, ...agentTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const TYPES = [
  Person.Person,
  Organization.Organization,
  HasSubject.HasSubject,
  Memory.Memory,
  FactEntry.FactEntry,
  Goal.Goal,
  Mode.Mode,
  Relay.Relay,
  ProfileOf.ProfileOf,
];

const HUES = ['amber', 'emerald', 'sky'];

const LAYOUT = [
  ...PARTICIPANTS.map((participant, index) => [
    { type: StoryRole.Chat, data: { participant, hue: HUES[index % HUES.length] }, id: `chat-${participant}` },
  ]),
  [StoryRole.AgentState, StoryRole.AgentKnowledge],
];

/** One prompt typed into a participant's panel; the next step waits until the agent has answered it. */
export type ConversationStep = { participant: Participant; prompt: string };

/** The "keep me posted" exchange: Josiah watches Dima, Rich asks for Dima's help, Dima agrees. */
const STEPS: ConversationStep[] = [
  { participant: 'Josiah', prompt: 'What is Dima working on? Keep me posted!' },
  { participant: 'Rich', prompt: 'Kai, ask Dima to come and work on the agent with me.' },
  { participant: 'Dima', prompt: "OK, I'll start working on it." },
];

/** How long the agent must stay quiet before a reply counts as finished (tool calls arrive as several messages). */
const SETTLE_MS = 4_000;

/** How long to wait for the agent to answer one prompt. */
const REPLY_TIMEOUT_MS = 180_000;

// Filled in by the setup; the play function reads each participant's chat from it.
const refs: PlaygroundRefs = { chats: {} };

// Captured from the setup hook so the play function can watch the chat feeds.
let storyDb: Database.Database | undefined;

/** The agent's messages in a participant's chat, oldest first. */
const assistantMessages = async (db: Database.Database, participant: Participant): Promise<Message.Message[]> => {
  const chat = (await db.query(Filter.type(Chat.Chat)).run()).find(
    (chat) => Obj.getURI(chat) === refs.chats[participant],
  );
  const feed = await chat?.feed.load();
  if (!feed) {
    return [];
  }
  const messages = await db.query(Query.select(Filter.type(Message.Message)).from(feed)).run();
  return messages.filter(({ sender }) => sender.role === 'assistant');
};

/**
 * Waits until the agent has answered in `participant`'s chat: more assistant messages than `before`,
 * ending in text, and nothing new for {@link SETTLE_MS}.
 */
const waitForReply = async (db: Database.Database, participant: Participant, before: number) => {
  let count = -1;
  let changedAt = Date.now();
  await waitFor(
    async () => {
      const messages = await assistantMessages(db, participant);
      if (messages.length !== count) {
        count = messages.length;
        changedAt = Date.now();
      }
      const last = messages.at(-1);
      const answered = count > before && last?.blocks.some((block) => block._tag === 'text');
      if (!answered || Date.now() - changedAt < SETTLE_MS) {
        throw new Error(`${participant} is still waiting for Kai (${count - before} new messages).`);
      }
    },
    { timeout: REPLY_TIMEOUT_MS, interval: 500 },
  );
};

/**
 * A scripted conversation on the live model: each step types a prompt as one person and waits for Kai
 * to answer before the next person speaks, so cross-chat effects (relays, watches) have landed. Edit
 * {@link STEPS} to play a different exchange. Live AI (DeepSeek V4 Pro through EDGE), so
 * excluded from CI.
 */
export const Conversation: Story = {
  decorators: createDecorators({
    plugins: [AgentPlugin.make()],
    types: TYPES,
    onReady: async ({ db, invoker }) => {
      storyDb = db;
      await setupPlayground({ db, invoker, model: PLAYGROUND_MODEL, read: true, refs });
    },
  }),
  args: { layout: LAYOUT },
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const { participant, prompt } of STEPS) {
      const panel = await canvas.findByTestId(`chat-panel-${participant}`, {}, { timeout: 60_000 });
      await waitFor(
        () => {
          if (!storyDb || !refs.chats[participant]) {
            throw new Error('The playground is still being set up.');
          }
        },
        { timeout: 60_000 },
      );
      const db = storyDb;
      if (!db) {
        return;
      }

      const before = (await assistantMessages(db, participant)).length;
      await submitPrompt(panel, prompt);
      await waitForReply(db, participant, before);
    }
  },
};
