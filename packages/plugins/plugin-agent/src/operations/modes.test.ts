//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { RDF } from '@dxos/pipeline-rdf';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { HasSubject, Message, Organization, Person, ProfileOf, Task, TaskSet } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import {
  ConversationSkill,
  GoalsSkill,
  InterviewSkill,
  ModesSkill,
  NoteTakerSkill,
  RelaySkill,
  SupportSkill,
} from '#skills';
import { AgentOperation, ChatParticipant, Goal, MemoryOperation, Mode, ModeOperation, Relay } from '#types';

import { makeTestBrain, testSpaceLayer } from '../brain/testing.ts';

EntityId.dangerouslyDisableRandomness();

const { text, toolCall } = ScriptedLanguageModel;

const tool = Operation.toolName;

const TYPES = [
  Agent.Agent,
  Chat.Chat,
  Skill.Skill,
  Feed.Feed,
  Text.Text,
  Instructions.Instructions,
  Person.Person,
  Organization.Organization,
  HasSubject.HasSubject,
  Goal.Goal,
  Mode.Mode,
  Relay.Relay,
  Task.Task,
  TaskSet.TaskSet,
  Message.Message,
  Markdown.Document,
  ProfileOf.ProfileOf,
];

const SKILLS = [
  ConversationSkill.make(),
  InterviewSkill.make(),
  RelaySkill.make(),
  ModesSkill.make(),
  NoteTakerSkill.make(),
  GoalsSkill.make(),
  SupportSkill.make(),
];

const brain = makeTestBrain();

const TestLayer = AssistantTestLayer({
  extraServices: Layer.merge(testSpaceLayer, brain.layer),
  operationHandlers: AgentOperationHandlerSet,
  types: TYPES,
  skills: SKILLS,
  disableLlmMemoization: true,
});

/** The registry keys a chat binds, read through `ListSkills`. */
const boundKeys = (agent: Ref.Ref<Agent.Agent>, chat: Chat.Chat) =>
  Operation.invoke(AgentOperation.ListSkills, { agent, chat: Ref.make(chat) }).pipe(
    Effect.map(({ skills }) => skills.map(({ key }) => key)),
  );

describe('Modes', () => {
  it.effect(
    'seeds the built-in modes and switches a chat between them, keeping the base skills bound',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const chat = yield* Agent.loadChat(agent);
        expect(chat).toBeDefined();
        if (!chat) {
          return;
        }
        yield* Database.flush();

        const listed = yield* Operation.invoke(ModeOperation.ListModes, { chat: Ref.make(chat) });
        expect(listed.current).toBe(Mode.DEFAULT);
        expect(listed.modes.map(({ name }) => name)).toEqual([
          'Conversation',
          'Note-taker',
          'Interviewer',
          'Relay',
          'Support',
        ]);
        expect(listed.modes.find(({ name }) => name === 'Note-taker')?.skills).toEqual([NoteTakerSkill.key]);
        expect(yield* boundKeys(agentRef, chat)).toEqual(
          expect.arrayContaining([ConversationSkill.key, ModesSkill.key, RelaySkill.key]),
        );
        expect(yield* boundKeys(agentRef, chat)).not.toContain(InterviewSkill.key);

        // Idempotent: listing again creates no second set of modes.
        yield* Operation.invoke(ModeOperation.ListModes, { chat: Ref.make(chat) });
        expect((yield* Database.query(Filter.type(Mode.Mode)).run).length).toBe(5);

        const switched = yield* Operation.invoke(ModeOperation.SwitchMode, {
          chat: Ref.make(chat),
          mode: 'note-taker',
        });
        expect(switched).toEqual({ mode: 'Note-taker', skills: [NoteTakerSkill.key] });
        yield* Database.flush();
        expect(Mode.getCurrent(chat)).toBe('Note-taker');
        const noting = yield* boundKeys(agentRef, chat);
        expect(noting).toEqual(
          expect.arrayContaining([ConversationSkill.key, ModesSkill.key, RelaySkill.key, NoteTakerSkill.key]),
        );

        // Another mode drops the note-taker's skill but never the base skills.
        yield* Operation.invoke(ModeOperation.SwitchMode, { chat: Ref.make(chat), mode: 'Interviewer' });
        yield* Database.flush();
        const interviewing = yield* boundKeys(agentRef, chat);
        expect(interviewing).toContain(InterviewSkill.key);
        expect(interviewing).not.toContain(NoteTakerSkill.key);
        expect(interviewing).toEqual(expect.arrayContaining([ConversationSkill.key, ModesSkill.key, RelaySkill.key]));
        expect(new Set(interviewing).size).toBe(interviewing.length);

        // Support binds the community-support skill in place of the interviewer's.
        const supporting = yield* Operation.invoke(ModeOperation.SwitchMode, { chat: Ref.make(chat), mode: 'support' });
        expect(supporting).toEqual({ mode: 'Support', skills: [SupportSkill.key] });
        yield* Database.flush();
        const supportKeys = yield* boundKeys(agentRef, chat);
        expect(supportKeys).toContain(SupportSkill.key);
        expect(supportKeys).not.toContain(InterviewSkill.key);

        const unknown = yield* Operation.invoke(ModeOperation.SwitchMode, {
          chat: Ref.make(chat),
          mode: 'Juggler',
        }).pipe(Effect.exit);
        expect(Exit.isFailure(unknown) && String(unknown.cause)).toContain('No mode named "Juggler"');
      },
      Effect.provide(Layer.merge(TestLayer, testSpaceLayer)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'mode switches neither restore a skill removed from the instructions nor take one a chat started with',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const instructions = yield* Database.load(agent.instructions);
        Obj.update(instructions, (instructions) => {
          instructions.skills = instructions.skills.filter(({ uri }) => uri !== Skill.registryURI(RelaySkill.key));
        });
        const person = yield* Database.add(Person.make({ fullName: 'Ada' }));
        yield* Database.flush();
        const { chat: chatRef } = yield* Operation.invoke(AgentOperation.EnsureParticipantChat, {
          agent: agentRef,
          person: Ref.make(person),
        });
        const chat = yield* Database.load(chatRef);
        yield* Database.flush();

        yield* Operation.invoke(ModeOperation.SwitchMode, { chat: chatRef, mode: 'Note-taker' });
        yield* Database.flush();
        expect(yield* boundKeys(agentRef, chat)).not.toContain(RelaySkill.key);

        // Relay is now only the Relay mode's skill, so leaving that mode unbinds it.
        yield* Operation.invoke(ModeOperation.SwitchMode, { chat: chatRef, mode: 'Relay' });
        yield* Database.flush();
        expect(yield* boundKeys(agentRef, chat)).toContain(RelaySkill.key);
        yield* Operation.invoke(ModeOperation.SwitchMode, { chat: chatRef, mode: Mode.DEFAULT });
        yield* Database.flush();
        expect(yield* boundKeys(agentRef, chat)).not.toContain(RelaySkill.key);

        // The agent's own chat started with Relay, and an edit to the instructions never takes it away.
        const primary = yield* Agent.loadChat(agent);
        expect(primary).toBeDefined();
        if (!primary) {
          return;
        }
        yield* Operation.invoke(ModeOperation.SwitchMode, { chat: Ref.make(primary), mode: 'Note-taker' });
        yield* Database.flush();
        yield* Operation.invoke(ModeOperation.SwitchMode, { chat: Ref.make(primary), mode: Mode.DEFAULT });
        yield* Database.flush();
        expect(yield* boundKeys(agentRef, primary)).toContain(RelaySkill.key);
        expect(yield* boundKeys(agentRef, primary)).not.toContain(NoteTakerSkill.key);
      },
      Effect.provide(Layer.merge(TestLayer, testSpaceLayer)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'records notes as facts stated by the agent about their subject',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const rich = yield* Database.add(Person.make({ fullName: 'Rich Burdon' }));
        const dima = yield* Database.add(Person.make({ fullName: 'Dima' }));
        const {
          facts: [lock, owner],
        } = yield* Operation.invoke(MemoryOperation.Remember, {
          agent,
          facts: [
            {
              subject: Ref.make<Obj.Unknown>(rich),
              predicate: 'proposes',
              value: 'the migration takes the write lock first',
              quote: 'The migration must take the write lock first.',
            },
            {
              subject: Ref.make<Obj.Unknown>(dima),
              predicate: 'works on',
              value: 'the indexer migration fix',
              quote: 'Dima owns the fix.',
            },
          ],
        });
        const { facts: recalled } = yield* Operation.invoke(MemoryOperation.Recall, {
          subject: Ref.make<Obj.Unknown>(rich),
        });
        expect(recalled).toEqual([
          expect.objectContaining({ id: lock, fact: 'Rich Burdon proposes the migration takes the write lock first' }),
        ]);
        const store = brain.facts((yield* Database.load(agent)).id);
        const stored = store ? yield* store.query({}) : [];
        const fact = stored.find((fact) => fact.graph === owner);
        expect(fact?.assertion.predicateIri).toBe(RDF.Ontology.DEFAULT.resolve('works on').iri);
        expect(fact?.attribution.agentLabel).toBe('Kai');
        expect(fact?.kind).toBeUndefined();
      },
      Effect.provide(Layer.merge(TestLayer, testSpaceLayer)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'keeps one keyed chat per person that is never the primary chat',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const primary = yield* Agent.loadChat(agent);
        const dima = yield* Database.add(Person.make({ fullName: 'Dima', preferredName: 'Dima' }));
        yield* Database.flush();

        const first = yield* Operation.invoke(AgentOperation.EnsureParticipantChat, {
          agent: agentRef,
          person: Ref.make<Obj.Unknown>(dima),
        });
        yield* Database.flush();
        const second = yield* Operation.invoke(AgentOperation.EnsureParticipantChat, {
          agent: agentRef,
          person: Ref.make<Obj.Unknown>(dima),
        });
        expect(second.chat.uri).toBe(first.chat.uri);

        const chat = yield* Database.load(first.chat);
        expect(ChatParticipant.get(chat)).toBe(dima.id);
        expect(Mode.getCurrent(chat)).toBe(Mode.DEFAULT);
        expect((yield* Agent.loadChat(agent))?.id).toBe(primary?.id);
        expect(yield* boundKeys(agentRef, chat)).toEqual(
          expect.arrayContaining([ConversationSkill.key, ModesSkill.key, RelaySkill.key]),
        );
      },
      Effect.provide(Layer.merge(TestLayer, testSpaceLayer)),
      TestHelpers.provideTestContext,
    ),
  );
});
