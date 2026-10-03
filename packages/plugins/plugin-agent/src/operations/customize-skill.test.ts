//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { AgentOperationHandlerSet } from '#operations';
import { ConversationSkill, GoalsSkill, InterviewSkill, ModesSkill, NoteTakerSkill, RelaySkill } from '#skills';
import { AgentOperation, Mode } from '#types';

import { findBound, openBinder } from './agent-skills.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [Agent.Agent, Chat.Chat, Skill.Skill, Feed.Feed, Text.Text, Instructions.Instructions, Mode.Mode],
  skills: [
    ConversationSkill.make(),
    InterviewSkill.make(),
    RelaySkill.make(),
    ModesSkill.make(),
    NoteTakerSkill.make(),
    GoalsSkill.make(),
  ],
  disableLlmMemoization: true,
});

/** The instructions a turn in the chat would render for the skill, read through a fresh binder as a session does. */
const resolveInstructions = (chat: Chat.Chat, key: string) =>
  Effect.gen(function* () {
    const binder = yield* openBinder(chat);
    const skill = findBound(binder, key);
    return skill ? { text: yield* Template.processTemplate(skill.instructions), skill } : undefined;
  }).pipe(Effect.scoped);

describe('CustomizeSkill', () => {
  it.effect(
    'binds an editable space copy, reflects edits, and resets to the compiled skill',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const primary = yield* Agent.loadChat(agent);
        expect(primary).toBeDefined();
        if (!primary) {
          return;
        }
        const { chat: threadRef } = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: agentRef,
          threadId: 'thread-1',
        });
        const thread = yield* Database.load(threadRef);
        yield* Database.flush();

        const compiled = yield* resolveInstructions(primary, RelaySkill.key);
        expect(compiled?.text).toContain('People may ask you to pass something on');
        expect(compiled && Obj.getDatabase(compiled.skill)).toBeUndefined();

        const before = yield* Operation.invoke(AgentOperation.ListSkills, { agent: agentRef });
        expect(before.skills.map(({ key, customized }) => ({ key, customized }))).toEqual(
          expect.arrayContaining([
            { key: ConversationSkill.key, customized: false },
            { key: ModesSkill.key, customized: false },
            { key: RelaySkill.key, customized: false },
          ]),
        );

        // Customize: every chat binds the agent's copy.
        const { skill: copyRef } = yield* Operation.invoke(AgentOperation.CustomizeSkill, {
          agent: agentRef,
          skill: RelaySkill.key,
        });
        yield* Database.flush();
        const copy = yield* Database.load(copyRef);
        expect(Obj.getParent(copy)?.id).toBe(agent.id);
        expect(copy.tools).toEqual(RelaySkill.make().tools);
        for (const chat of [primary, thread]) {
          const resolved = yield* resolveInstructions(chat, RelaySkill.key);
          expect(resolved?.skill.id).toBe(copy.id);
          expect(resolved?.text).toContain('People may ask you to pass something on');
        }

        const again = yield* Operation.invoke(AgentOperation.CustomizeSkill, {
          agent: agentRef,
          skill: RelaySkill.key,
        });
        expect(again.skill.uri).toBe(copyRef.uri);

        // Edit: the next resolution reads the copy's current text.
        const text = yield* Database.load(copy.instructions.source);
        Obj.update(text, (text) => {
          text.content = 'Ask only about hobbies.';
        });
        yield* Database.flush();
        expect((yield* resolveInstructions(thread, RelaySkill.key))?.text).toBe('Ask only about hobbies.');
        const listed = yield* Operation.invoke(AgentOperation.ListSkills, { agent: agentRef });
        expect(listed.skills.find(({ key }) => key === RelaySkill.key)).toMatchObject({ customized: true });

        // Reset: back to the compiled skill, and the copy is gone.
        yield* Operation.invoke(AgentOperation.ResetSkill, { agent: agentRef, skill: RelaySkill.key });
        yield* Database.flush();
        for (const chat of [primary, thread]) {
          const resolved = yield* resolveInstructions(chat, RelaySkill.key);
          expect(resolved && Obj.getDatabase(resolved.skill)).toBeUndefined();
          expect(resolved?.skill.name).toBe('Relay');
          expect(resolved?.text).toContain('People may ask you to pass something on');
        }
        const instructions = yield* Database.load(agent.instructions);
        expect(instructions.skills.map((ref) => ref.uri)).toEqual([
          Skill.registryURI(ModesSkill.key),
          Skill.registryURI(RelaySkill.key),
          Skill.registryURI(GoalsSkill.key),
        ]);
        expect(yield* Database.load(Ref.make(copy)).pipe(Effect.option)).toMatchObject({ _tag: 'None' });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
