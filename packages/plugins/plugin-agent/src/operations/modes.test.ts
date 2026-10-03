//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

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
import * as ProfileOf from '@dxos/plugin-crm/ProfileOf';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { HasSubject, Message, Organization, Person, Task, TaskSet } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { ConversationSkill, InterviewSkill, LearnSkill, ModesSkill, NoteTakerSkill, RelaySkill } from '#skills';
import { AgentOperation, ChatParticipant, Goal, Memory, MemoryOperation, Mode, ModeOperation, Relay } from '#types';

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
  Memory.Memory,
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
  LearnSkill.make(),
];

const TestLayer = AssistantTestLayer({
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
        expect(listed.modes.map(({ name }) => name)).toEqual(['Conversation', 'Note-taker', 'Interviewer', 'Relay']);
        expect(listed.modes.find(({ name }) => name === 'Note-taker')?.skills).toEqual([NoteTakerSkill.key]);
        expect(yield* boundKeys(agentRef, chat)).toEqual(
          expect.arrayContaining([ConversationSkill.key, ModesSkill.key, RelaySkill.key]),
        );
        expect(yield* boundKeys(agentRef, chat)).not.toContain(InterviewSkill.key);

        // Idempotent: listing again creates no second set of modes.
        yield* Operation.invoke(ModeOperation.ListModes, { chat: Ref.make(chat) });
        expect((yield* Database.query(Filter.type(Mode.Mode)).run).length).toBe(4);

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

        const unknown = yield* Operation.invoke(ModeOperation.SwitchMode, {
          chat: Ref.make(chat),
          mode: 'Juggler',
        }).pipe(Effect.exit);
        expect(Exit.isFailure(unknown) && String(unknown.cause)).toContain('No mode named "Juggler"');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'records a note with a markdown body attached to its subject',
    Effect.fnUntraced(
      function* ({ expect }) {
        const rich = yield* Database.add(Person.make({ fullName: 'Rich Burdon' }));
        const body = '- The migration must take the write lock first.\n- Dima owns the fix.';
        const { memory: memoryRef } = yield* Operation.invoke(MemoryOperation.Remember, {
          content: 'Notes on the indexer migration race.',
          kind: 'note',
          subjects: [Ref.make<Obj.Unknown>(rich)],
          body,
        });
        const memory = yield* Database.load(memoryRef);
        expect(memory.kind).toBe('note');
        expect(memory.body).toBeDefined();
        if (memory.body) {
          expect((yield* Database.load(memory.body)).content).toBe(body);
        }
      },
      Effect.provide(TestLayer),
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
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

describe('LearnFromDocument', () => {
  // Filled in by the test before the turn runs; the script reads them when it emits the tool calls.
  const refs: { dima?: string; rich?: string; document?: string } = {};

  /** The learning turn: the tool calls the document warrants, then a one-line summary. */
  const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
    if (!request.text.includes(LearnSkill.PROMPT_MARKER)) {
      return { parts: [text('Unexpected request.')] };
    }
    if (request.prompt.content.at(-1)?.role === 'tool') {
      return { parts: [text('Recorded 2 memories and 1 goal.')] };
    }
    return {
      parts: [
        toolCall(tool(MemoryOperation.Remember), () => ({
          content: 'Dima owns the indexer.',
          kind: 'fact',
          subjects: [refs.dima],
          source: refs.document,
        })),
        toolCall(tool(MemoryOperation.Remember), () => ({
          content: 'Do not page Dima after 6pm (set by Dima).',
          kind: 'directive',
          subjects: [refs.dima],
          source: refs.document,
        })),
        toolCall(tool(MemoryOperation.ProposeGoal), () => ({
          title: 'Fix the flaky CI caused by the indexer migration race',
          horizon: 'now',
          owners: [refs.dima],
        })),
      ],
    };
  };

  it.effect(
    'runs a model turn that records what the document says',
    Effect.fnUntraced(
      function* ({ expect }) {
        const dima = yield* Database.add(Person.make({ fullName: 'Dima', preferredName: 'Dima' }));
        const rich = yield* Database.add(Person.make({ fullName: 'Rich Burdon', preferredName: 'Rich' }));
        const document = yield* Database.add(
          Markdown.make({ name: 'CI triage', content: '**Rich:** Dima owns the indexer. Do not page her after 6pm.' }),
        );
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        yield* Database.flush();
        refs.dima = Obj.getURI(dima);
        refs.rich = Obj.getURI(rich);
        refs.document = Obj.getURI(document);

        const result = yield* Operation.invoke(AgentOperation.LearnFromDocument, {
          agent: agentRef,
          document: Ref.make<Obj.Unknown>(document),
        });
        expect(result).toMatchObject({ memories: 2, goals: 1 });

        const memories = yield* Database.query(Filter.type(Memory.Memory)).run;
        expect(memories.map(({ kind }) => kind).sort()).toEqual(['directive', 'fact']);
        const learning = yield* Database.load(result.chat);
        expect(Obj.getParent(learning)?.id).toBe(agent.id);
        // Keyed by the document, so it never displaces the agent's primary chat.
        expect((yield* Agent.loadChat(agent))?.id).not.toBe(learning.id);
      },
      Effect.provide(
        AssistantTestLayer({
          operationHandlers: AgentOperationHandlerSet,
          types: TYPES,
          skills: SKILLS,
          aiService: ScriptedLanguageModel.scriptedAiService(script),
        }),
      ),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
