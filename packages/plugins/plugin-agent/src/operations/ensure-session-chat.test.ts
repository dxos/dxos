//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { test } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { TrajectoryStore } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EID, EntityId, SpaceId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Channel } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { AgentChannels, AgentOperation, AgentSession, Mode } from '#types';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [
    Agent.Agent,
    Chat.Chat,
    Skill.Skill,
    Feed.Feed,
    Text.Text,
    Instructions.Instructions,
    Channel.Channel,
    AgentChannels.AgentChannels,
    Mode.Mode,
  ],
  disableLlmMemoization: true,
});

const MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

describe('EnsureSessionChat', () => {
  test('is invoked by the key AgentSession exports', ({ expect }) => {
    expect(String(AgentOperation.EnsureSessionChat.meta.key)).toContain(AgentSession.ENSURE_CHAT_KEY);
  });

  it.effect(
    'creates a session chat once and finds it again',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, {
          name: 'Concierge',
          instructions: 'Greet people.',
        });
        const agent = yield* Database.load(agentRef);
        const primary = yield* Agent.loadChat(agent);
        yield* Database.flush();

        const first = yield* Operation.invoke(AgentOperation.EnsureSessionChat, {
          kind: 'mcp',
          key: 'session-1',
          title: 'MCP: hello',
        });
        const again = yield* Operation.invoke(AgentOperation.EnsureSessionChat, {
          agent: 'concierge',
          kind: 'mcp',
          key: 'session-1',
          model: MODEL,
        });
        const other = yield* Operation.invoke(AgentOperation.EnsureSessionChat, {
          agent: Obj.getURI(agent),
          kind: 'mcp',
          key: 'session-2',
        });

        expect(first.created).toBe(true);
        expect(first.agentName).toBe('Concierge');
        expect(again.created).toBe(false);
        expect(again.chat.uri).toBe(first.chat.uri);
        expect(again.feed.uri).toBe(first.feed.uri);
        expect(other.created).toBe(true);
        expect(other.chat.uri).not.toBe(first.chat.uri);

        const chat = yield* Database.load(first.chat);
        expect(chat.id).not.toBe(primary?.id);
        expect(chat.name).toBe('MCP: hello');
        expect(Obj.getParent(chat)?.id).toBe(agent.id);
        expect(Obj.getMeta(chat).keys).toEqual([AgentSession.chatKey('mcp', 'session-1')]);
        expect(Obj.getMeta(chat).keys[0].source).toBe('org.dxos.agent/session');
        // A later turn's model is kept on the chat.
        expect(String(chat.session?.model)).toContain(MODEL);

        // The new chat is bound to the agent's session skills and the chat itself.
        const events = yield* TrajectoryStore.read(yield* Database.load(first.feed));
        const binds = events.flatMap(({ payload }) => (payload._tag === 'contextBind' ? [payload] : []));
        expect(binds.flatMap(({ skills }) => skills).length).toBeGreaterThan(0);
        expect(binds.flatMap(({ objects }) => objects.map(({ uri }) => uri))).toContain(first.chat.uri);

        // A session chat never shadows the agent's primary chat.
        expect((yield* Agent.loadChat(agent))?.id).toBe(primary?.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'refuses a kind with a colon, which would collide with another session',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Concierge' });
        // Would share the foreign key `mcp:tenant:session` with kind `mcp`, key `tenant:session`.
        const exit = yield* Operation.invoke(AgentOperation.EnsureSessionChat, {
          kind: 'mcp:tenant',
          key: 'session',
        }).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        // The handler refuses it too, for an in-process caller whose input is not decoded against the schema.
        const { default: ensureSessionChat } = yield* Effect.promise(() => import('./ensure-session-chat.ts'));
        const direct = yield* ensureSessionChat.handler({ kind: 'mcp:tenant', key: 'session' }).pipe(Effect.exit);
        expect(String(direct)).toMatch(/may not contain ':'/);
        const allowed = yield* Operation.invoke(AgentOperation.EnsureSessionChat, {
          kind: 'mcp',
          key: 'tenant:session',
        });
        expect(allowed.created).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'refuses an agent in another space',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Concierge' });
        const entityId = EID.getEntityId(EID.parse(agent.uri));
        expect(entityId).toBeDefined();
        const elsewhere = EID.make({ spaceId: SpaceId.random(), entityId });
        const exit = yield* Operation.invoke(AgentOperation.EnsureSessionChat, {
          agent: elsewhere,
          kind: 'mcp',
          key: 'session-1',
        }).pipe(Effect.exit);
        expect(String(exit)).toMatch(/is not in this space/);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'refuses an agent the space does not have',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Concierge' });
        const exit = yield* Operation.invoke(AgentOperation.EnsureSessionChat, {
          agent: 'Nobody',
          kind: 'mcp',
          key: 'session-1',
        }).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        expect(String(exit)).toMatch(/No single agent is called Nobody/);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
