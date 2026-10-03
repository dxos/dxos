//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { type Database, Filter } from '@dxos/echo';
import * as AgentPlugin from '@dxos/plugin-agent/AgentPlugin';
import * as Goal from '@dxos/plugin-agent/Goal';
import * as Memory from '@dxos/plugin-agent/Memory';
import * as Mode from '@dxos/plugin-agent/Mode';
import * as Relay from '@dxos/plugin-agent/Relay';
import { translations as agentTranslations } from '@dxos/plugin-agent/translations';
import * as ProfileOf from '@dxos/plugin-crm/ProfileOf';
import { HasSubject, Organization, Person } from '@dxos/types';

import { StoryRole } from '../modules/index.ts';
import {
  ModuleContainer,
  PARTICIPANTS,
  PLAYGROUND_MODEL,
  type PlaygroundRefs,
  SCRIPTED_PROMPTS,
  SCRIPTED_REPLIES,
  TRANSCRIPT_NAME,
  createDecorators,
  makePlaygroundScript,
  setupPlayground,
  storyParameters,
  submitPrompt,
} from '../testing/index.ts';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/AgentPlayground',
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
  Goal.Goal,
  Mode.Mode,
  Relay.Relay,
  ProfileOf.ProfileOf,
];

/** One chat per person, then the agent's state with a Learn action on the transcript. */
const LAYOUT = [
  ...PARTICIPANTS.map((participant) => [{ type: StoryRole.Chat, data: { participant }, id: `chat-${participant}` }]),
  [{ type: StoryRole.AgentState, data: { learnFrom: TRANSCRIPT_NAME } }],
];

/**
 * Rich, Dima and Josiah each talk to the same agent (Kai) in their own chat; every prompt is
 * attributed to the panel's person, so the agent knows who is speaking. The agent learns from a
 * transcript of an earlier CI-triage conversation on load (the Learn button re-runs it). Live AI
 * (DeepSeek V4 Pro through EDGE), so excluded from CI.
 *
 * Try:
 * 1. Wait for the knowledge graph to fill: people, the release goal, the "don't page Dima after 6pm" rule.
 * 2. As Rich: "Tell Dima the fix landed." — the message appears in Dima's panel.
 * 3. As Dima, reply — Kai reports back in Rich's panel.
 * 4. As Rich: "Take notes", then dictate (mic button) — the channel's mode becomes Note-taker and notes appear.
 * 5. As Josiah: "Interview me" — his channel switches to Interviewer.
 */
export const Playground: Story = {
  decorators: createDecorators({
    plugins: [AgentPlugin.make()],
    types: TYPES,
    onReady: ({ db, invoker }) => setupPlayground({ db, invoker, model: PLAYGROUND_MODEL, learn: true }),
  }),
  args: { layout: LAYOUT },
  tags: ['!test'],
};

// Filled in by the setup; the scripted model reads them when it emits tool calls.
const refs: PlaygroundRefs = { chats: {} };

// Captured from the setup hook so assertions read the objects the operations write.
let storyDb: Database.Database | undefined;

/** Polls the space until `predicate` holds, reporting what it last saw. */
const waitForSpace = async <T,>(read: (db: Database.Database) => Promise<T>, predicate: (value: T) => boolean) => {
  let value: T | undefined;
  await waitFor(
    async () => {
      value = storyDb ? await read(storyDb) : undefined;
      if (value === undefined || !predicate(value)) {
        throw new Error(`The space never reached the expected state; last saw: ${JSON.stringify(value)}`);
      }
    },
    { timeout: 60_000, interval: 250 },
  );
};

/** Waits for `text` in a panel, reporting what the panel shows if it never appears. */
const findInPanel = (element: HTMLElement, text: string) =>
  waitFor(
    () => {
      if (!element.textContent?.includes(text)) {
        throw new Error(`"${text}" never appeared; the panel shows: ${element.textContent?.slice(-600)}`);
      }
    },
    { timeout: 60_000, interval: 250 },
  );

/** The panel of one participant. */
const panel = async (canvasElement: HTMLElement, participant: string): Promise<HTMLElement> =>
  within(canvasElement).findByTestId(`chat-panel-${participant}`, {}, { timeout: 60_000 });

/**
 * The same layout on a scripted model: learns the transcript on load, relays from Rich to Dima and
 * back, and switches Rich's channel to note-taking.
 */
export const PlaygroundScripted: Story = {
  decorators: createDecorators({
    plugins: [AgentPlugin.make()],
    types: TYPES,
    scripted: makePlaygroundScript(refs),
    onReady: async ({ db, invoker }) => {
      storyDb = db;
      await setupPlayground({ db, invoker, learn: true, refs });
    },
  }),
  args: { layout: LAYOUT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. The agent learned the transcript: the graph has people, memories, a rule and a goal.
    await waitFor(() => expect(Number(canvas.getByTestId('agent-state-memories').textContent)).toBeGreaterThan(0), {
      timeout: 60_000,
    });
    await waitFor(() => expect(Number(canvas.getByTestId('agent-state-goals').textContent)).toBeGreaterThan(0));
    await waitFor(() => expect(canvas.getByTestId('agent-state-people').textContent).toBe('3'));
    await waitForSpace(
      (db) => db.query(Filter.type(Memory.Memory)).run(),
      (memories) => memories.some(({ kind }) => kind === 'directive'),
    );

    // 2. Rich asks Kai to tell Dima; the message lands in Dima's panel.
    const rich = await panel(canvasElement, 'Rich');
    const dima = await panel(canvasElement, 'Dima');
    await submitPrompt(rich, SCRIPTED_PROMPTS.relay);
    await findInPanel(rich, SCRIPTED_REPLIES.relayed);
    await findInPanel(dima, SCRIPTED_REPLIES.delivered);

    // 3. Dima replies in her panel; Kai reports back in Rich's.
    await submitPrompt(dima, SCRIPTED_PROMPTS.reply);
    await findInPanel(rich, SCRIPTED_REPLIES.reported);
    await waitForSpace(
      (db) => db.query(Filter.type(Relay.Relay)).run(),
      (relays) => relays.some(({ status }) => status === 'reported'),
    );

    // 4. Rich switches to note-taking; his channel shows the mode and a note memory is recorded.
    await submitPrompt(rich, SCRIPTED_PROMPTS.noteTaker);
    await findInPanel(rich, SCRIPTED_REPLIES.switched);
    await canvas.findByText('Mode: Note-taker', {}, { timeout: 30_000 });
    await submitPrompt(rich, SCRIPTED_PROMPTS.note);
    await findInPanel(rich, SCRIPTED_REPLIES.noted);
    await waitForSpace(
      (db) => db.query(Filter.type(Memory.Memory)).run(),
      (memories) => memories.some(({ kind, body }) => kind === 'note' && body !== undefined),
    );
  },
};
