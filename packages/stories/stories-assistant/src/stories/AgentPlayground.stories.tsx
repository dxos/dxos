//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Chat from '@dxos/assistant/Chat';
import { type Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import * as AgentPlugin from '@dxos/plugin-agent/AgentPlugin';
import * as ChatParticipant from '@dxos/plugin-agent/ChatParticipant';
import * as FactEntry from '@dxos/plugin-agent/FactEntry';
import * as Goal from '@dxos/plugin-agent/Goal';
import * as Memory from '@dxos/plugin-agent/Memory';
import * as Mode from '@dxos/plugin-agent/Mode';
import * as Relay from '@dxos/plugin-agent/Relay';
import { translations as agentTranslations } from '@dxos/plugin-agent/translations';
import { HasSubject, Message, Organization, Person, ProfileOf } from '@dxos/types';

import { StoryRole } from '../modules/index.ts';
import {
  GOAL_FACTS,
  ModuleContainer,
  PARTICIPANTS,
  PLAYGROUND_MODEL,
  type PlaygroundRefs,
  POSTED_FACTS,
  SCRIPTED_PROMPTS,
  SCRIPTED_REPLIES,
  TRANSCRIPT_FACTS,
  createDecorators,
  greeting,
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

/**
 * Checks that `predicate` keeps holding for `duration`: a negative check ("nothing was sent") must watch
 * for a while, since what it rules out would arrive asynchronously, after the step it follows.
 */
const holdsFor = async <T,>(
  read: (db: Database.Database) => Promise<T>,
  predicate: (value: T) => boolean,
  duration = 2_000,
) => {
  const deadline = Date.now() + duration;
  while (Date.now() < deadline) {
    const value = storyDb ? await read(storyDb) : undefined;
    if (value === undefined || !predicate(value)) {
      throw new Error(`The space left the expected state; saw: ${JSON.stringify(value)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
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

/** The text of every message the agent posted in a participant's chat; tool calls are left out. */
const readReplies = async (db: Database.Database, participant: string) => {
  // By participant rather than URI: setup records participant chats by a ref URI whose form differs from `Obj.getURI`.
  const person = (await db.query(Filter.type(Person.Person)).run()).find(
    ({ preferredName }) => preferredName === participant,
  );
  const chat = (await db.query(Filter.type(Chat.Chat)).run()).find(
    (chat) => person !== undefined && ChatParticipant.get(chat) === person.id,
  );
  const feed = await chat?.feed.load();
  if (!feed) {
    return [];
  }
  const messages = await db.query(Query.select(Filter.type(Message.Message)).from(feed)).run();
  return messages
    .filter(({ sender }) => sender.role === 'assistant')
    .flatMap(({ blocks }) => blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])));
};

/** The panel of one participant. */
const panel = async (canvasElement: HTMLElement, participant: string): Promise<HTMLElement> =>
  within(canvasElement).findByTestId(`chat-panel-${participant}`, {}, { timeout: 60_000 });

/**
 * The same layout on a scripted model: reads the transcript on load, then plays a keep-me-posted
 * exchange. Josiah asks what Dima is working on and to be kept updated; Rich says he is on the agent
 * plugin and asks Kai to get Dima's help; Dima agrees, and Josiah is told what she is now working on.
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

    // 2. Each person says hi first, and waits for Kai's answer before the next one does.
    const rich = await panel(canvasElement, 'Rich');
    const dima = await panel(canvasElement, 'Dima');
    const josiah = await panel(canvasElement, 'Josiah');
    for (const [name, element] of [
      ['Josiah', josiah],
      ['Rich', rich],
      ['Dima', dima],
    ] as const) {
      await submitPrompt(element, SCRIPTED_PROMPTS.greet);
      await findInPanel(element, greeting(name));
    }

    // 3. Josiah asks what Dima is working on and to be kept updated: Kai answers, records a goal Josiah owns and
    // one ongoing watch, and forwards nothing yet.
    const [richFact, dimaFact] = POSTED_FACTS;
    const isUpdate = (reply: string) => reply.startsWith('Update on Dima');
    const josiahReplies = (db: Database.Database) => readReplies(db, 'Josiah');
    const postedGoal = (goals: Awaited<ReturnType<typeof readGoals>>) =>
      goals.find(({ title, owners }) => title.includes('kept posted') && owners.includes('Josiah'));
    await submitPrompt(josiah, SCRIPTED_PROMPTS.keepPosted);
    await findInPanel(josiah, SCRIPTED_REPLIES.postedWatching);
    await waitForSpace(readGoals, (goals) => postedGoal(goals)?.status === 'active');
    await userEvent.click(canvas.getByTestId('agent-knowledge-tab-goals'));
    await expectWatches(canvasElement, 1);
    await holdsFor(josiahReplies, (replies) => !replies.some(isUpdate));

    // 4. Rich says what he is working on, then asks for Dima's help: the request lands in Dima's panel and the relay
    // waits for her. Rich's own fact is recorded at the end of his turn, but it is about Rich, so nothing reaches
    // Josiah — checked over a window, since a wrongly fired update would arrive after the fact is written.
    await submitPrompt(rich, SCRIPTED_PROMPTS.working);
    await findInPanel(rich, SCRIPTED_REPLIES.workingNoted);
    await submitPrompt(rich, SCRIPTED_PROMPTS.needHelp);
    await findInPanel(rich, SCRIPTED_REPLIES.askedDima);
    await findInPanel(dima, SCRIPTED_REPLIES.helpDelivered);
    await waitForSpace(
      (db) => db.query(Filter.type(Relay.Relay)).run(),
      (relays) => relays.length === 1 && relays[0].status === 'delivered',
    );
    await waitForSpace(readQuotes, (quotes) => quotes.includes(richFact.quote));
    await holdsFor(josiahReplies, (replies) => !replies.some(isUpdate));
    // Not "Update on Dima": the panel shows the watch's tool call, whose message template starts with it.
    await expect(occurrences(josiah, 'agent plugin')).toBe(0);

    // 5. Dima agrees: Kai reports back to Rich and closes the relay, and Josiah gets exactly one update that says
    // what "that" is — the conversation reached the composer — rather than the bare quote. The watch and its goal
    // stay open for later updates.
    await submitPrompt(dima, SCRIPTED_PROMPTS.agree);
    await findInPanel(rich, SCRIPTED_REPLIES.helpReported);
    await waitForSpace(
      (db) => db.query(Filter.type(Relay.Relay)).run(),
      (relays) => relays.length === 1 && relays[0].status === 'reported',
    );
    await waitForSpace(readQuotes, (quotes) => quotes.includes(dimaFact.quote));
    await waitForSpace(josiahReplies, (replies) => replies.includes(SCRIPTED_REPLIES.postedComposed));
    await findInPanel(josiah, SCRIPTED_REPLIES.postedComposed);
    await holdsFor(
      josiahReplies,
      (replies) =>
        replies.filter(isUpdate).length === 1 &&
        replies.includes(SCRIPTED_REPLIES.postedComposed) &&
        !replies.includes(SCRIPTED_REPLIES.postedBare),
    );
    await expect(occurrences(josiah, SCRIPTED_REPLIES.postedComposed)).toBe(1);
    await expectWatches(canvasElement, 1);
    await waitForSpace(readGoals, (goals) => postedGoal(goals)?.status === 'active');
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
    // A wrongly fired notification would arrive after the fact is written, so the check holds over a window.
    await holdsFor(readRichReplies, (replies) => !replies.includes(SCRIPTED_REPLIES.composed));
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
