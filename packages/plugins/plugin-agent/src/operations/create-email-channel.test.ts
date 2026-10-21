//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Session from '@dxos/assistant/Session';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Text } from '@dxos/schema';
import { Channel } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { AgentChannels, AgentEmail, AgentOperation, Mode } from '#types';

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [
    Agent.Agent,
    Session.Session,
    Skill.Skill,
    Feed.Feed,
    Text.Text,
    Instructions.Instructions,
    Channel.Channel,
    AgentChannels.AgentChannels,
    AgentEmail.AgentEmail,
    Mode.Mode,
  ],
  disableLlmMemoization: true,
});

describe('CreateEmailChannel', () => {
  it.effect(
    'adds an email channel the agent owns',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);

        const { channel: channelRef } = yield* Operation.invoke(AgentOperation.CreateEmailChannel, {
          agent: agentRef,
          handle: ' Kai ',
          allowedSenders: [],
        });
        yield* Database.flush();

        const channel = yield* Database.load(channelRef);
        const config = yield* Database.load(channel.backend.config);
        expect(AgentEmail.instanceOf(config) && config.handle).toBe('kai');
        expect((yield* AgentChannels.loadChannels(agent)).map(({ id }) => id)).toEqual([channel.id]);

        // Owned by the agent's channel list, so the space's channel list (top-level channels only) leaves it out.
        const list = yield* AgentChannels.loadForAgent(agent);
        expect(Obj.getParent(channel)?.id).toBe(list?.id);
        const topLevel = yield* Database.query(Filter.and(Filter.type(Channel.Channel), Filter.hasParent(false))).run;
        expect(topLevel).toHaveLength(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'returns the email channel the agent already has',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const first = yield* Operation.invoke(AgentOperation.CreateEmailChannel, {
          agent: agentRef,
          handle: 'kai',
          allowedSenders: [],
        });
        const second = yield* Operation.invoke(AgentOperation.CreateEmailChannel, {
          agent: agentRef,
          handle: 'kai-2',
          allowedSenders: [],
        });
        yield* Database.flush();

        expect(second.channel.uri).toBe(first.channel.uri);
        const agent = yield* Database.load(agentRef);
        expect(yield* AgentChannels.loadChannels(agent)).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
