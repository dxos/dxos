//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Chat from '@dxos/assistant/Chat';
import { type Database, Feed, Filter, Obj, Query } from '@dxos/echo';
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
  GOAL_FACTS,
  ModuleContainer,
  PARTICIPANTS,
  PLAYGROUND_MODEL,
  type PlaygroundRefs,
  SCRIPTED_PROMPTS,
  SCRIPTED_REPLIES,
  TRANSCRIPT_FACTS,
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
  FactEntry.FactEntry,
  Goal.Goal,
  Mode.Mode,
  Relay.Relay,
  ProfileOf.ProfileOf,
];

const HUES = ['amber', 'emerald', 'sky'];

/** One chat per person (each in its own hue), then the agent's state over its knowledge. */
const makeLayout = (initialPrompt?: string) => [
  ...PARTICIPANTS.map((participant, index) => [
    {
      type: StoryRole.Chat,
      data: { participant, hue: HUES[index % HUES.length], initialPrompt },
      id: `chat-${participant}`,
    },
  ]),
  [StoryRole.AgentState, StoryRole.AgentKnowledge],
];

const LAYOUT = makeLayout();

/**
 * Rich, Dima and Josiah each talk to the same agent (Kai) in their own chat; every prompt is
 * attributed to the panel's person, so the agent knows who is speaking. The agent reads a transcript
 * of an earlier CI-triage conversation on load (`readSource`), recording its facts in the transcript's
 * annotation feed. Live AI (DeepSeek V4 Pro through EDGE), so excluded from CI.
 *
 * Each person opens by saying "hello".
 *
 * Try:
 * 1. Wait for the facts to fill: who owns the fix, the P0 priority, the "don't page Dima after 6pm" rule.
 * 2. As Rich: "Tell Dima the fix landed." — the message appears in Dima's panel.
 * 3. As Dima, reply — Kai reports back in Rich's panel.
 * 4. As Rich: "Take notes", then dictate (mic button) — the channel's mode becomes Note-taker and notes appear.
 * 5. As Josiah: "Interview me" — his channel switches to Interviewer.
 */
export const Playground: Story = {
  decorators: createDecorators({
    plugins: [AgentPlugin.make()],
    types: TYPES,
    onReady: ({ db, invoker }) => setupPlayground({ db, invoker, model: PLAYGROUND_MODEL, read: true }),
  }),
  args: { layout: makeLayout('hello') },
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
 * The same layout on a scripted model: reads the transcript on load, relays from Rich to Dima and
 * back, and switches Rich's channel to note-taking.
 */
export const PlaygroundScripted: Story = {
  decorators: createDecorators({
    plugins: [AgentPlugin.make()],
    types: TYPES,
    scripted: makePlaygroundScript(refs),
    onReady: async ({ db, invoker }) => {
      storyDb = db;
      await setupPlayground({ db, invoker, read: true, refs });
    },
  }),
  args: { layout: LAYOUT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. The agent read the transcript into its annotation feed, with no conversation of its own.
    await waitFor(
      () => expect(Number(canvas.getByTestId('agent-state-facts').textContent)).toBe(TRANSCRIPT_FACTS.length),
      { timeout: 60_000 },
    );
    await waitFor(() => expect(canvas.getByTestId('agent-state-people').textContent).toBe('3'));
    await waitFor(() => expect(canvas.getByTestId('agent-state-conversations').textContent).toBe('3'));
    await waitForSpace(
      async (db) => {
        const feeds = await db.query(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY })).run();
        if (feeds.length === 0) {
          return [];
        }
        const entries = await db.query(Query.select(Filter.type(FactEntry.FactEntry)).from(feeds)).run();
        return entries.flatMap(({ facts }) => facts);
      },
      // The rule is Dima's, so the fact is attributed to her line of the transcript.
      (facts) =>
        facts.some(
          ({ assertion, attribution, illocution }) =>
            assertion.quote?.includes('6pm') && attribution.agent === 'dima' && illocution?.force === 'directive',
        ),
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

/**
 * Rich asks Kai to tell him when Dima's indexer PR is up: Kai records a goal Rich owns and watches
 * the facts it reads at the end of every turn. Live AI, so excluded from CI.
 *
 * Try:
 * 1. As Rich: "Let me know when Dima's indexer PR is up." — a goal and its watch appear under Goals.
 * 2. As Dima: "Still working on the indexer PR." — nothing reaches Rich.
 * 3. As Dima: "The indexer PR is up." — Rich is told, and the goal is achieved.
 */
export const Goals: Story = {
  decorators: createDecorators({
    plugins: [AgentPlugin.make()],
    types: TYPES,
    onReady: ({ db, invoker }) => setupPlayground({ db, invoker, model: PLAYGROUND_MODEL }),
  }),
  args: { layout: LAYOUT },
  tags: ['!test'],
};

/** The goals the space holds, with their status and owners' names. */
const readGoals = async (db: Database.Database) =>
  (await db.query(Filter.type(Goal.Goal)).run()).map(({ title, status, owners }) => ({
    title,
    status,
    owners: owners.map(({ target }) => (Obj.instanceOf(Person.Person, target) ? target.preferredName : undefined)),
  }));

/** The quotes of every fact the agent recorded. */
const readQuotes = async (db: Database.Database) => {
  const feeds = await db.query(Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY })).run();
  if (feeds.length === 0) {
    return [];
  }
  const entries = await db.query(Query.select(Filter.type(FactEntry.FactEntry)).from(feeds)).run();
  return entries.flatMap(({ facts }) => facts.map(({ assertion }) => assertion.quote));
};

/** The text of every message the agent posted in Rich's chat; tool calls, which quote the watch's message, are left out. */
const readRichReplies = async (db: Database.Database) => {
  const chat = (await db.query(Filter.type(Chat.Chat)).run()).find((chat) => Obj.getURI(chat) === refs.chats.Rich);
  const feed = await chat?.feed.load();
  if (!feed) {
    return [];
  }
  const messages = await db.query(Query.select(Filter.type(Message.Message)).from(feed)).run();
  return messages
    .filter(({ sender }) => sender.role === 'assistant')
    .flatMap(({ blocks }) => blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])));
};

/** How often `text` appears in a panel. */
const occurrences = (element: HTMLElement, text: string) => (element.textContent ?? '').split(text).length - 1;

/** Waits until the knowledge panel lists `count` watches. */
const expectWatches = (canvasElement: HTMLElement, count: number) =>
  waitFor(() => expect(within(canvasElement).queryAllByTestId('agent-knowledge-watch')).toHaveLength(count), {
    timeout: 30_000,
  });

/**
 * The goals scenario on a scripted model: a watch registered from Rich's chat fires only when a
 * fact recorded at the end of one of Dima's turns matches it.
 */
export const GoalsScripted: Story = {
  decorators: createDecorators({
    plugins: [AgentPlugin.make()],
    types: TYPES,
    scripted: makePlaygroundScript(refs),
    onReady: async ({ db, invoker }) => {
      storyDb = db;
      await setupPlayground({ db, invoker, refs });
    },
  }),
  args: { layout: LAYOUT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rich = await panel(canvasElement, 'Rich');
    const dima = await panel(canvasElement, 'Dima');
    const [watchFact, stillWorkingFact] = GOAL_FACTS;

    // 1. Rich asks to be told; Kai records a goal Rich owns, not yet achieved, with one watch listed.
    await submitPrompt(rich, SCRIPTED_PROMPTS.watch);
    await findInPanel(rich, SCRIPTED_REPLIES.watching);
    await waitForSpace(readGoals, (goals) =>
      goals.some(
        ({ title, status, owners }) => title.includes('indexer PR') && status !== 'achieved' && owners.includes('Rich'),
      ),
    );
    await userEvent.click(canvas.getByTestId('agent-knowledge-tab-goals'));
    await expectWatches(canvasElement, 1);
    // Rich's own request was read at the end of his turn, and did not fire the watch.
    await waitForSpace(readQuotes, (quotes) => quotes.includes(watchFact.quote));
    await waitForSpace(readRichReplies, (replies) => !replies.includes(SCRIPTED_REPLIES.composed));

    // 2. Dima says she is still working on it; the turn's fact is recorded but denies it, so nothing fires.
    await submitPrompt(dima, SCRIPTED_PROMPTS.stillWorking);
    await findInPanel(dima, SCRIPTED_REPLIES.acknowledged);
    await waitForSpace(readQuotes, (quotes) => quotes.includes(stillWorkingFact.quote));
    // The watch is evaluated right after the facts are written; give a wrongly-fired notification time to land.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await waitForSpace(readRichReplies, (replies) => !replies.includes(SCRIPTED_REPLIES.composed));
    await expect(occurrences(rich, SCRIPTED_REPLIES.composed)).toBe(0);
    await expectWatches(canvasElement, 1);
    await waitForSpace(readGoals, (goals) => goals.length === 1 && goals[0].status === 'active');

    // 3. Dima says the PR is up; Rich gets the composed update (not the template), the goal is achieved and the
    // watch is gone.
    await submitPrompt(dima, SCRIPTED_PROMPTS.prUp);
    await waitForSpace(readRichReplies, (replies) => replies.includes(SCRIPTED_REPLIES.composed));
    await waitForSpace(readRichReplies, (replies) => !replies.includes(SCRIPTED_REPLIES.notified));
    await waitFor(() => expect(occurrences(rich, SCRIPTED_REPLIES.composed)).toBe(1), { timeout: 30_000 });
    await waitForSpace(readGoals, (goals) => goals.length === 1 && goals[0].status === 'achieved');
    await expectWatches(canvasElement, 0);
    await waitFor(() =>
      expect(canvas.getByTestId('agent-knowledge-goal').getAttribute('data-status')).toBe('achieved'),
    );
  },
};
