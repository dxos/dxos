//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { HasSubject, Message, Organization, Person } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { BrainSkill, ConversationSkill, GoalsSkill, ModesSkill, RelaySkill } from '#skills';
import { AgentOperation, BrainService, FactEntry, Goal, Memory, Mode, Relay, Trigger, TriggerOperation } from '#types';

import { COMPOSE_PROMPT } from '../operations/compose-update.ts';
import { makeTestBrain } from './testing.ts';

EntityId.dangerouslyDisableRandomness();

/**
 * The local brain through its shared `BrainService`, with Kai (the agent) in two private chats: Alice's
 * and Bob's. The model is scripted, so each test states exactly which turns run and asserts what the
 * brain made of them: who is known by which identity, which watch woke, and which chat was told.
 */

const ALICE = 'did:halo:BALICEALICEALICEALICEALICEALICEALI';
const BOB = 'did:halo:BBOBBOBBOBBOBBOBBOBBOBBOBBOBBOBBOB';

/** What people say, verbatim: the script extracts facts from these quotes and composes updates from them. */
const LINE = {
  aliceWatchesBob: 'Keep me posted about what Bob is working on.',
  bobWatchesAlice: 'Keep me updated about what Alice is working on.',
  aliceAwaitsShip: 'Tell me once Bob ships the indexer migration.',
  bobWorking: "I'm working on the indexer migration.",
  bobShipped: 'The indexer migration has shipped.',
  aliceWorking: "I'm reviewing the release notes.",
  aliceAboutBob: 'Bob is busy with the indexer migration.',
} as const;

/** What a scripted extractor finds in each line. */
const FACTS: Readonly<Record<string, { subject: string; predicate: string; object: string }>> = {
  [LINE.bobWorking]: { subject: 'Bob', predicate: 'works on', object: 'indexer migration' },
  [LINE.bobShipped]: { subject: 'indexer migration', predicate: 'has', object: 'shipped' },
  [LINE.aliceWorking]: { subject: 'Alice', predicate: 'reviews', object: 'release notes' },
  [LINE.aliceAboutBob]: { subject: 'Bob', predicate: 'is busy with', object: 'indexer migration' },
};

/** The watch the goals skill would set up for each request. */
const WATCHES: Readonly<
  Record<string, { requester: 'alice' | 'bob'; outcome: string; when: Trigger.FactPattern; ongoing: boolean }>
> = {
  [LINE.aliceWatchesBob]: {
    requester: 'alice',
    outcome: "Alice is kept posted on Bob's work",
    when: { speaker: 'Bob' },
    ongoing: true,
  },
  [LINE.bobWatchesAlice]: {
    requester: 'bob',
    outcome: "Bob is kept posted on Alice's work",
    when: { speaker: 'Alice' },
    ongoing: true,
  },
  [LINE.aliceAwaitsShip]: {
    requester: 'alice',
    outcome: 'Bob ships the indexer migration',
    when: { speaker: 'Bob', about: 'shipped' },
    ongoing: false,
  },
};

/** The first line of pipeline-rdf's extraction prompt, which is how the script tells extraction calls apart. */
const EXTRACTION_PROMPT = 'You extract atomic propositions';

/** A composed update names the lines it passes on, so a test can tell which fact reached which chat. */
const UPDATE = 'Update:';
const update = (...lines: string[]): string => `${UPDATE} ${lines.join(' / ')}`;

type Refs = { agent?: string; alice?: string; bob?: string };

/** The first words of the compile and oracle prompts, so the script tells those calls apart. */
const COMPILE_PROMPT = "You compile an agent's goals";
const ORACLE_PROMPT = 'You write acceptance tests for an agent';

/** Rules a careful compiler writes for "keep me posted about what Bob is working on". */
const GOOD_RULES = `wake(bob) :- speaker(F, ${JSON.stringify(BOB)}).`;
/** Rules that wake on anything anyone says, which the oracle's near miss exposes. */
const WRONG_RULES = 'wake(any) :- fact(F, _, _, _).';

/** The timeline an oracle writes from the goal's text alone: Alice's own words are a near miss. */
const TIMELINE = JSON.stringify({
  steps: [
    {
      after: '10m',
      says: [{ speaker: ALICE, quote: 'Lunch?', subject: ALICE, predicate: 'suggests', object: 'lunch' }],
      wake: false,
    },
    {
      after: '1h',
      says: [{ speaker: BOB, quote: 'On the indexer.', subject: BOB, predicate: 'works on', object: 'indexer' }],
      wake: true,
    },
  ],
});

/** What the scripted compiler answers; `off` replies with no rules, as a model that ignored the format. */
let compiler: 'off' | 'good' | 'wrong' = 'off';

const { text, toolCall } = ScriptedLanguageModel;

const lastUserText = (request: ScriptedLanguageModel.ScriptedRequest): string => {
  const lastUser = request.prompt.content.findLast((message) => message.role === 'user');
  if (lastUser === undefined) {
    return '';
  }
  return typeof lastUser.content === 'string'
    ? lastUser.content
    : lastUser.content.map((part) => (part.type === 'text' ? part.text : '')).join('');
};

const makeScript =
  (refs: Refs): ScriptedLanguageModel.ScriptedTurnGenerator =>
  (request) => {
    if (request.text.startsWith(COMPOSE_PROMPT)) {
      // Only the facts being passed on: the transcript and the draft also quote lines.
      const facts = request.text.split('What changed:')[1]?.split('A draft')[0] ?? '';
      return { parts: [text(update(...Object.keys(FACTS).filter((line) => facts.includes(line))))] };
    }
    if (request.text.startsWith(ORACLE_PROMPT)) {
      return { parts: [text(compiler === 'off' ? 'Noted.' : TIMELINE)] };
    }
    if (request.text.startsWith(COMPILE_PROMPT)) {
      const rules = compiler === 'good' ? GOOD_RULES : compiler === 'wrong' ? WRONG_RULES : undefined;
      return {
        parts: [
          text(rules ? `<kind>condition</kind>\n<drivers>fact</drivers>\n<datalog>\n${rules}\n</datalog>` : 'Noted.'),
        ],
      };
    }
    if (request.text.includes(EXTRACTION_PROMPT)) {
      const facts = Object.entries(FACTS)
        .filter(([quote]) => request.text.includes(quote))
        .map(([quote, fact]) => ({ ...fact, quote, factuality: 'CT+', polarity: '+' }));
      return { parts: [text(JSON.stringify({ facts }))] };
    }
    if (request.text.includes('Suggest a name for this chat')) {
      return { parts: [text('Kai')] };
    }
    if (request.prompt.content.at(-1)?.role === 'tool') {
      return { parts: [text("I'll let you know.")] };
    }
    const said = lastUserText(request);
    const woken = BrainSkill.wakeText(said);
    if (woken !== undefined) {
      return { parts: [text(woken)] };
    }
    const watch = Object.entries(WATCHES).find(([line]) => said.includes(line));
    if (watch) {
      const [line, { requester, outcome, when, ongoing }] = watch;
      return {
        parts: [
          toolCall(Operation.toolName(TriggerOperation.WatchFacts), {
            agent: refs.agent,
            requester: refs[requester],
            request: line,
            outcome,
            when,
            message: `${UPDATE} {fact}`,
            ongoing,
          }),
        ],
      };
    }
    return { parts: [text('Noted.')] };
  };

const refs: Refs = {};
/** The brain's clock, moved forward by tests of time-driven rules. */
let offset = 0;
const brain = makeTestBrain({ now: () => Date.now() + offset });

const TestLayer = brain.layer.pipe(
  Layer.provideMerge(
    AssistantTestLayer({
      operationHandlers: AgentOperationHandlerSet,
      extraServices: brain.layer,
      types: [
        Agent.Agent,
        Chat.Chat,
        Skill.Skill,
        Feed.Feed,
        Text.Text,
        Instructions.Instructions,
        Person.Person,
        Organization.Organization,
        HasSubject.HasSubject,
        Memory.Memory,
        Goal.Goal,
        Mode.Mode,
        Relay.Relay,
        Message.Message,
        FactEntry.FactEntry,
        FactEntry.ExtractionPass,
      ],
      skills: [ConversationSkill.make(), RelaySkill.make(), ModesSkill.make(), GoalsSkill.make(), BrainSkill.make()],
      aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),
    }),
  ),
);

/** Kai, with a private chat for Alice and one for Bob. */
const setup = Effect.fnUntraced(function* () {
  const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
  const agent = yield* Database.load(agentRef);
  const open = (identityDid: string, name: string) =>
    Operation.invoke(AgentOperation.OpenPrivateChat, { agent: agentRef, identityDid, name }).pipe(
      Effect.flatMap(({ chat, person }) => Effect.all({ chat: Database.load(chat), person: Database.load(person) })),
    );
  const alice = yield* open(ALICE, 'Alice');
  const bob = yield* open(BOB, 'Bob');
  yield* Database.flush();
  Object.assign(refs, { agent: Obj.getURI(agent), alice: Obj.getURI(alice.person), bob: Obj.getURI(bob.person) });
  return { agent, alice: alice.chat, bob: bob.chat };
});

/** Submits a prompt the way Composer does (no sender name: the private chat says who), then waits for its hooks. */
const say = Effect.fnUntraced(function* (chat: Chat.Chat, prompt: string) {
  const session = yield* AgentService.getSession(chat);
  yield* session.submitPrompt(prompt);
  yield* session.waitForCompletion();
});

/** Waits for the chat's current turn, e.g. one the brain woke. */
const settle = Effect.fnUntraced(function* (chat: Chat.Chat) {
  const session = yield* AgentService.getSession(chat);
  yield* session.waitForCompletion();
});

/** The updates the agent wrote in the chat. */
const updates = (chat: Chat.Chat) =>
  Database.load(chat.feed).pipe(
    Effect.flatMap((feed) => Feed.query(feed, Filter.type(Message.Message)).run),
    Effect.map((messages) =>
      messages
        .filter((message) => message.sender.role === 'assistant')
        .map(Message.extractText)
        .filter((reply) => reply.startsWith(UPDATE)),
    ),
  );

/** Every subscription's unacknowledged events. */
const pending = Effect.fnUntraced(function* (agent: Agent.Agent) {
  const service = yield* BrainService.BrainService;
  const subscriptions = yield* service.subscriptions(agent.id);
  return (yield* Effect.forEach(subscriptions, ({ id }) => service.take(id))).flat();
});

describe('local brain: two private chats', () => {
  afterEach(() => {
    brain.triggers.snapshot.forEach(({ id }) => brain.triggers.remove(id));
    offset = 0;
    compiler = 'off';
  });

  it.effect(
    'knows each person by their identity, in what they say and what is said about them',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, alice, bob } = yield* setup();
        yield* say(bob, LINE.bobWorking);
        yield* say(alice, LINE.aliceWorking);

        const service = yield* BrainService.BrainService;
        const facts = yield* service.query(agent.id, {});
        const said = (quote: string) => facts.find((fact) => fact.assertion.quote === quote);
        expect(said(LINE.bobWorking)?.attribution.agent).toBe(BOB);
        expect(said(LINE.bobWorking)?.assertion.subject).toMatchObject({ entity: BOB, label: 'Bob' });
        expect(said(LINE.aliceWorking)?.attribution.agent).toBe(ALICE);
        expect(
          (yield* service.query(agent.id, { subjectEntity: BOB })).map(({ assertion }) => assertion.quote),
        ).toEqual([LINE.bobWorking]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    "a watch set in Alice's chat is answered by what Bob says in his, once per fact",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, alice, bob } = yield* setup();
        yield* say(alice, LINE.aliceWatchesBob);

        const service = yield* BrainService.BrainService;
        const [watch, ...others] = yield* service.subscriptions(agent.id);
        expect(others).toHaveLength(0);
        // The rules name Bob by his identity, not by the name Alice used.
        expect(watch.rules).toContain(JSON.stringify(BOB));

        yield* say(bob, LINE.bobWorking);
        yield* settle(alice);
        expect(yield* updates(alice)).toEqual([update(LINE.bobWorking)]);
        expect(yield* updates(bob)).toEqual([]);
        // An ongoing watch acknowledges what it passed on, and keeps watching.
        expect(yield* pending(agent)).toEqual([]);
        expect(yield* service.subscriptions(agent.id)).toHaveLength(1);

        yield* say(bob, LINE.bobShipped);
        yield* settle(alice);
        expect(yield* updates(alice)).toEqual([update(LINE.bobWorking), update(LINE.bobShipped)]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'the agent passing an update on does not wake the watch again, nor does Alice talking about Bob',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { alice, bob } = yield* setup();
        yield* say(alice, LINE.aliceWatchesBob);
        yield* say(bob, LINE.bobWorking);
        yield* settle(alice);
        // Kai's relay in Alice's chat quotes Bob's words; they are Kai's now, and quiet.
        yield* say(alice, 'Thanks.');
        expect(yield* updates(alice)).toEqual([update(LINE.bobWorking)]);

        // A fact about Bob that Alice states is not Bob saying it.
        yield* say(alice, LINE.aliceAboutBob);
        expect(yield* updates(alice)).toEqual([update(LINE.bobWorking)]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'when two people watch each other, each one hears only about the other',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, alice, bob } = yield* setup();
        yield* say(alice, LINE.aliceWatchesBob);
        yield* say(bob, LINE.bobWatchesAlice);
        expect(yield* (yield* BrainService.BrainService).subscriptions(agent.id)).toHaveLength(2);

        yield* say(bob, LINE.bobWorking);
        yield* settle(alice);
        yield* say(alice, LINE.aliceWorking);
        yield* settle(bob);

        expect(yield* updates(alice)).toEqual([update(LINE.bobWorking)]);
        expect(yield* updates(bob)).toEqual([update(LINE.aliceWorking)]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'a one-time watch fires on the fact it waits for, achieves its goal and stops',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, alice, bob } = yield* setup();
        yield* say(alice, LINE.aliceAwaitsShip);
        const service = yield* BrainService.BrainService;
        expect(yield* service.subscriptions(agent.id)).toHaveLength(1);

        // Bob speaking about something else is not the outcome.
        yield* say(bob, LINE.bobWorking);
        expect(yield* updates(alice)).toEqual([]);

        yield* say(bob, LINE.bobShipped);
        yield* settle(alice);
        expect(yield* updates(alice)).toEqual([update(LINE.bobShipped)]);
        expect(yield* service.subscriptions(agent.id)).toEqual([]);
        const [goal] = yield* Database.query(Filter.type(Goal.Goal)).run;
        expect(goal).toMatchObject({ title: 'Bob ships the indexer migration', status: 'achieved' });

        yield* say(bob, LINE.bobShipped);
        expect(yield* updates(alice)).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'pushing the same facts again queues nothing',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, alice, bob } = yield* setup();
        yield* say(alice, LINE.aliceWatchesBob);
        yield* say(bob, LINE.bobWorking);
        yield* settle(alice);

        const service = yield* BrainService.BrainService;
        const facts = yield* service.query(agent.id, { subjectEntity: BOB });
        expect(yield* service.push(agent.id, facts)).toBe(0);
        expect(yield* pending(agent)).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'a watch that waits on the clock wakes its chat when its time comes, once',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, alice } = yield* setup();
        yield* say(alice, LINE.aliceAwaitsShip);
        const service = yield* BrainService.BrainService;
        const [watch] = yield* service.subscriptions(agent.id);
        // The goal's text compiled to a follow-up: nudge Alice if nothing happened within two days.
        // Started on the brain's clock: the test context's clock stamps operations at the epoch.
        yield* service.subscribe({
          ...watch,
          createdAt: new Date().toISOString(),
          ongoing: true,
          rules: `${watch.rules}\nwake(followup) :- elapsed(goal, 2d), not achieved(goal).`,
        });
        const [clocked] = yield* service.subscriptions(agent.id);
        const due = yield* service.nextDueAt(agent.id);
        expect(Date.parse(due ?? '') - Date.parse(clocked.createdAt)).toBe(2 * 24 * 60 * 60_000);

        const run = Operation.invoke(TriggerOperation.RunDue, { agent: Ref.make(agent) });
        expect((yield* run).fired).toEqual([]);
        offset = 2 * 24 * 60 * 60_000 + 60_000;
        expect((yield* run).fired).toEqual([watch.id]);
        yield* settle(alice);
        expect(yield* updates(alice)).toHaveLength(1);
        // It fired once; the clock has nothing more for it.
        expect((yield* run).fired).toEqual([]);
        expect(yield* service.nextDueAt(agent.id)).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    "a goal compiled from its text replaces the pattern once it replays the oracle's timeline",
    Effect.fnUntraced(
      function* ({ expect }) {
        compiler = 'good';
        const { agent, alice, bob } = yield* setup();
        yield* say(alice, LINE.aliceWatchesBob);
        const service = yield* BrainService.BrainService;
        const [watch] = yield* service.subscriptions(agent.id);
        expect(watch.rules).toBe(GOOD_RULES);

        yield* say(alice, LINE.aliceWorking);
        yield* say(bob, LINE.bobWorking);
        yield* settle(alice);
        expect(yield* updates(alice)).toEqual([update(LINE.bobWorking)]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'a compilation that fails the replay gate is not used, and the pattern stands',
    Effect.fnUntraced(
      function* ({ expect }) {
        compiler = 'wrong';
        const { agent, alice } = yield* setup();
        yield* say(alice, LINE.aliceWatchesBob);
        const [watch] = yield* (yield* BrainService.BrainService).subscriptions(agent.id);
        expect(watch.rules).not.toContain(WRONG_RULES);
        expect(watch.rules).toContain(`wake(${Trigger.MATCH_LABEL})`);
        expect(watch.rules).toContain(JSON.stringify(BOB));

        // Had the wrong rules gone active, Alice's own words would wake her watch.
        yield* say(alice, LINE.aliceWorking);
        expect(yield* updates(alice)).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
