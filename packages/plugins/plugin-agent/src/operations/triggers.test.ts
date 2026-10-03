//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

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
import { ConversationSkill, GoalsSkill, ModesSkill, RelaySkill } from '#skills';
import {
  AgentOperation,
  FactEntry,
  Goal,
  Memory,
  Mode,
  Relay,
  RelayOperation,
  Trigger,
  TriggerOperation,
} from '#types';

import { TriggerRegistry, triggerRegistry } from '../triggers.ts';
import { matchesPattern } from './match-facts.ts';
import { fireTriggers } from './run-triggers.ts';

EntityId.dangerouslyDisableRandomness();

const SAID_AT = '2026-10-03T12:00:00.000Z';

/** A fact as `readSource` records it from a chat message. */
const fact = ({
  speaker = 'dima',
  subject = 'indexer PR',
  predicate = 'is',
  object = 'up',
  quote = 'The indexer PR is up.',
  polarity = '+',
  force,
  saidAt = SAID_AT,
}: {
  speaker?: string;
  subject?: string;
  predicate?: string;
  object?: string;
  quote?: string;
  polarity?: '+' | '-';
  force?: Trigger.Force;
  saidAt?: string;
} = {}): FactEntry.Fact => ({
  id: `fact-${subject}-${predicate}-${object}`,
  assertion: { subject: { label: subject }, predicate, object: { label: object }, quote },
  factuality: { value: polarity === '+' ? 'CT+' : 'CT-', polarity },
  ...(force ? { illocution: { force } } : {}),
  attribution: { agent: speaker, source: 'dxn:chat', generatedAtTime: saidAt },
  recordedAt: saidAt,
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: 'hash',
});

const PR_IS_UP: Trigger.FactPattern = { speaker: 'Dima', about: 'indexer PR', force: 'assertive', polarity: '+' };

describe('matchesPattern', () => {
  it('matches on speaker, force, polarity and the words the fact mentions', ({ expect }) => {
    expect(matchesPattern(PR_IS_UP, fact())).toBe(true);
    // A plain assertion records no illocution; a commitment is not the PR being up.
    expect(matchesPattern(PR_IS_UP, fact({ force: 'commissive' }))).toBe(false);
    expect(matchesPattern(PR_IS_UP, fact({ speaker: 'rich' }))).toBe(false);
    expect(matchesPattern(PR_IS_UP, fact({ polarity: '-' }))).toBe(false);
    expect(matchesPattern(PR_IS_UP, fact({ subject: 'release', quote: 'The release is up.' }))).toBe(false);
    // Words match anywhere in the fact, and as prefixes from three letters.
    expect(matchesPattern({ about: 'indexers' }, fact())).toBe(false);
    expect(matchesPattern({ about: 'index' }, fact())).toBe(true);
    expect(matchesPattern({ about: 'pr' }, fact({ subject: 'prior art', quote: 'Prior art is up.' }))).toBe(false);
    expect(matchesPattern({ subject: 'indexer', text: 'is up' }, fact())).toBe(true);
  });

  it('names a speaker by their first name and bounds the time the fact was said', ({ expect }) => {
    expect(matchesPattern({ speaker: 'Rich' }, fact({ speaker: 'rich-burdon' }))).toBe(true);
    expect(matchesPattern({ speaker: 'Rich Burdon' }, fact({ speaker: 'rich' }))).toBe(true);
    expect(matchesPattern({ speaker: 'Richard' }, fact({ speaker: 'rich' }))).toBe(false);
    expect(matchesPattern(PR_IS_UP, fact(), { after: '2026-10-03T13:00:00.000Z' })).toBe(false);
    expect(matchesPattern({ ...PR_IS_UP, before: '2026-10-03T11:00:00.000Z' }, fact())).toBe(false);
    expect(matchesPattern({ ...PR_IS_UP, after: '2026-10-03T11:00:00.000Z' }, fact())).toBe(true);
  });
});

describe('renderMessage', () => {
  const trigger = (message: string, ongoing?: boolean): Trigger.Trigger => ({
    id: 'one',
    agent: 'kai',
    when: { speaker: 'Dima' },
    then: { _tag: 'notify', recipient: Ref.make<Obj.Unknown>(Person.make({ fullName: 'Josiah' })), message },
    ...(ongoing ? { ongoing } : {}),
    createdAt: SAID_AT,
  });

  it('fills the fact placeholder, appends the fact to an ongoing update, and leaves a one-time message alone', ({
    expect,
  }) => {
    expect(Trigger.renderMessage(trigger('Update on Dima: {fact}'), 'on the agent plugin')).toBe(
      'Update on Dima: on the agent plugin',
    );
    expect(Trigger.renderMessage(trigger('Update on Dima.', true), 'on the agent plugin')).toBe(
      'Update on Dima: on the agent plugin',
    );
    expect(Trigger.renderMessage(trigger('It is up.'), 'on the agent plugin')).toBe('It is up.');
  });
});

describe('TriggerRegistry', () => {
  it('lists triggers per agent, notifies on change and removes once', ({ expect }) => {
    const registry = new TriggerRegistry();
    let changes = 0;
    const unsubscribe = registry.subscribe(() => changes++);
    const trigger = (id: string, agent: string): Trigger.Trigger => ({
      id,
      agent,
      when: PR_IS_UP,
      then: {
        _tag: 'notify',
        recipient: Ref.make<Obj.Unknown>(Person.make({ fullName: 'Rich' })),
        message: 'It is up.',
      },
      createdAt: SAID_AT,
    });
    registry.add(trigger('one', 'kai'));
    registry.add(trigger('two', 'other'));
    const snapshot = registry.snapshot;
    expect(registry.list('kai').map(({ id }) => id)).toEqual(['one']);
    expect(registry.snapshot).toBe(snapshot);

    expect(registry.remove('one')).toBe(true);
    expect(registry.remove('one')).toBe(false);
    expect(registry.list('kai')).toEqual([]);
    expect(changes).toBe(3);
    unsubscribe();
    registry.remove('two');
    expect(changes).toBe(3);
  });
});

//
// End of turn.
//

/** The first line of pipeline-rdf's extraction prompt, which is how the script tells extraction calls apart. */
const EXTRACTION_PROMPT = 'You extract atomic propositions';

const PROMPTS = {
  ask: "Let me know when Dima's indexer PR is up.",
  distractor: 'Still working on the indexer PR, it should be up tomorrow.',
  up: 'The indexer PR is up.',
};

const NOTIFICATION = "Dima's indexer PR is up.";

/** What the extractor finds in each prompt; each quote is verbatim, so the fact is attributed to its speaker. */
const FACTS = [
  {
    subject: "Dima's indexer PR",
    predicate: 'is',
    object: 'up',
    quote: PROMPTS.ask,
    force: 'directive',
    polarity: '+',
  },
  { subject: 'indexer PR', predicate: 'is', object: 'up', quote: PROMPTS.distractor, factuality: 'CT-', polarity: '-' },
  { subject: 'indexer PR', predicate: 'is', object: 'up', quote: PROMPTS.up, polarity: '+' },
];

type Refs = { agent?: string; rich?: string };

const { text, toolCall } = ScriptedLanguageModel;

/** Answers extraction calls from {@link FACTS}; Rich's request becomes a watch, everything else a short reply. */
const makeScript =
  (refs: Refs): ScriptedLanguageModel.ScriptedTurnGenerator =>
  (request) => {
    if (request.text.includes(EXTRACTION_PROMPT)) {
      const facts = FACTS.filter(({ quote }) => request.text.includes(quote)).map(({ factuality, ...fact }) => ({
        ...fact,
        factuality: factuality ?? 'CT+',
      }));
      return { parts: [text(JSON.stringify({ facts }))] };
    }
    if (request.text.includes('Suggest a name for this chat')) {
      return { parts: [text('Kai')] };
    }
    if (request.prompt.content.at(-1)?.role === 'tool') {
      return { parts: [text("I'll let you know.")] };
    }
    const lastUser = request.prompt.content.findLast((message) => message.role === 'user');
    const said =
      lastUser === undefined
        ? ''
        : typeof lastUser.content === 'string'
          ? lastUser.content
          : lastUser.content.map((part) => (part.type === 'text' ? part.text : '')).join('');
    if (said.includes(PROMPTS.ask)) {
      return {
        parts: [
          toolCall(Operation.toolName(TriggerOperation.WatchFacts), {
            agent: refs.agent,
            requester: refs.rich,
            outcome: "Dima's indexer PR is up",
            when: PR_IS_UP,
            message: NOTIFICATION,
          }),
        ],
      };
    }
    return { parts: [text('Thanks.')] };
  };

const refs: Refs = {};

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
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
  ],
  skills: [ConversationSkill.make(), RelaySkill.make(), ModesSkill.make(), GoalsSkill.make()],
  aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),
});

const texts = (chat: Chat.Chat) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(chat.feed);
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    return messages.map((message) => Message.extractText(message));
  });

/** Submits a prompt as `name` in the chat and waits for the turn, and its end-request hooks, to finish. */
const say = (chat: Chat.Chat, name: string, prompt: string) =>
  Effect.gen(function* () {
    const session = yield* AgentService.getSession(chat);
    yield* session.submitPrompt(prompt, { sender: { name } });
    yield* session.waitForCompletion();
  });

describe('end-of-turn triggers', () => {
  afterEach(() => {
    triggerRegistry.snapshot.forEach(({ id }) => triggerRegistry.remove(id));
  });

  it.effect(
    'watches for an outcome and notifies its owner when a matching fact is said, and not before',
    Effect.fnUntraced(
      function* ({ expect }) {
        const rich = yield* Database.add(Person.make({ fullName: 'Rich Burdon', preferredName: 'Rich' }));
        const dima = yield* Database.add(Person.make({ fullName: 'Dima', preferredName: 'Dima' }));
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const richChat = yield* Agent.loadChat(agent);
        if (!richChat) {
          expect.fail('The agent has no chat.');
          return;
        }
        yield* Operation.invoke(RelayOperation.AssignChatParticipant, {
          chat: Ref.make(richChat),
          person: Ref.make<Obj.Unknown>(rich),
        });
        const { chat: dimaChatRef } = yield* Operation.invoke(AgentOperation.EnsureParticipantChat, {
          agent: agentRef,
          person: Ref.make<Obj.Unknown>(dima),
        });
        const dimaChat = yield* Database.load(dimaChatRef);
        yield* Database.flush();
        Object.assign(refs, { agent: Obj.getURI(agent), rich: Obj.getURI(rich) });

        // 1. Rich asks; the watch is registered under a goal he owns, and nothing is sent yet.
        yield* say(richChat, 'Rich', PROMPTS.ask);
        const [goal, ...others] = yield* Database.query(Filter.type(Goal.Goal)).run;
        expect(others).toHaveLength(0);
        expect(goal).toMatchObject({ title: "Dima's indexer PR is up", status: 'active' });
        expect(goal.owners.map((owner) => owner.target?.id)).toEqual([rich.id]);
        const [trigger] = triggerRegistry.list(agent.id);
        expect(trigger.goal?.target?.id).toBe(goal.id);
        expect(yield* texts(richChat)).not.toContain(NOTIFICATION);

        // 2. Dima says she is still working on it: her fact is about the PR but negative, so nothing fires.
        yield* say(dimaChat, 'Dima', PROMPTS.distractor);
        expect(triggerRegistry.list(agent.id)).toHaveLength(1);
        expect(yield* texts(richChat)).not.toContain(NOTIFICATION);
        expect(goal.status).toBe('active');

        // 3. Dima says it is up: the turn's fact fires the trigger, Rich is told and the goal is achieved.
        yield* say(dimaChat, 'Dima', PROMPTS.up);
        expect(yield* texts(richChat)).toContain(NOTIFICATION);
        expect(goal.status).toBe('achieved');
        expect(triggerRegistry.list(agent.id)).toEqual([]);

        // Each turn was read once: the chat's facts are the distractor's and the announcement's, never repeated.
        const [annotations] = yield* Database.query(
          Filter.and(
            Filter.type(Feed.Feed, { kind: FactEntry.ANNOTATIONS_KEY }),
            Filter.foreignKeys(Feed.Feed, [{ source: FactEntry.ANNOTATIONS_KEY, id: dimaChat.id }]),
          ),
        ).run;
        const entries = yield* Feed.query(annotations, Filter.type(FactEntry.FactEntry)).run;
        expect(entries.flatMap(({ facts }) => facts.map(({ assertion }) => assertion.quote))).toEqual([
          PROMPTS.distractor,
          PROMPTS.up,
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'keeps an ongoing watch after it fires and passes each matching fact on, leaving its goal open',
    Effect.fnUntraced(
      function* ({ expect }) {
        const josiah = yield* Database.add(Person.make({ fullName: 'Josiah', preferredName: 'Josiah' }));
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const { chat: josiahChatRef } = yield* Operation.invoke(AgentOperation.EnsureParticipantChat, {
          agent: agentRef,
          person: Ref.make<Obj.Unknown>(josiah),
        });
        const josiahChat = yield* Database.load(josiahChatRef);
        const goal = yield* Database.add(
          Goal.make({
            title: "Josiah is kept posted on Dima's work",
            horizon: 'now',
            status: 'active',
            owners: [Ref.make<Obj.Unknown>(josiah)],
          }),
        );
        yield* Database.flush();
        triggerRegistry.add({
          id: 'posted',
          agent: agent.id,
          goal: Ref.make(goal),
          when: { speaker: 'Dima', after: '2026-10-03T00:00:00.000Z' },
          then: { _tag: 'notify', recipient: Ref.make<Obj.Unknown>(josiah), message: 'Update on Dima: {fact}' },
          ongoing: true,
          createdAt: '2026-10-03T00:00:00.000Z',
        });

        // 1. Each of Dima's facts is passed on; the watch stays and the goal stays open.
        const plugin = "I'm working on the agent plugin.";
        const landed = 'The indexer fix landed.';
        yield* fireTriggers(agent, [
          fact({ subject: 'Dima', predicate: 'works on', object: 'agent plugin', quote: plugin }),
        ]);
        yield* fireTriggers(agent, [
          fact({ subject: 'indexer fix', predicate: 'is', object: 'landed', quote: landed }),
        ]);
        const sent = yield* texts(josiahChat);
        expect(sent).toContain(`Update on Dima: ${plugin}`);
        expect(sent).toContain(`Update on Dima: ${landed}`);
        expect(triggerRegistry.list(agent.id)).toHaveLength(1);
        expect(goal.status).toBe('active');

        // 2. Someone else's fact does not match the speaker.
        yield* fireTriggers(agent, [fact({ speaker: 'rich', quote: 'I am reviewing it.' })]);
        expect(yield* texts(josiahChat)).not.toContain('Update on Dima: I am reviewing it.');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
