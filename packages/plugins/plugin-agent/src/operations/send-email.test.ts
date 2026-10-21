//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Session from '@dxos/assistant/Session';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Text } from '@dxos/schema';
import { Channel, Person } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { AgentChannels, AgentEmail, AgentMailbox, AgentOperation, EmailOperation, Mode } from '#types';

const sent: AgentMailbox.SendRequest[] = [];

const FakeMailbox = Layer.succeed(AgentMailbox.AgentMailboxService, {
  claim: () => Effect.die('Not claimed in this test.'),
  release: () => Effect.die('Not released in this test.'),
  status: () => Effect.die('Not read in this test.'),
  send: (request) => {
    sent.push(request);
    return Effect.succeed({ messageId: `<${sent.length}@dx.pub>`, thread: request.thread ?? 'new-thread' });
  },
});

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
    Person.Person,
    Mode.Mode,
  ],
  extraServices: FakeMailbox,
  disableLlmMemoization: true,
});

describe('EmailOperation.Send', () => {
  it.effect(
    "sends from the agent's claimed address, and leaves a contact unchecked by EDGE",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Kai' });
        const agent = yield* Database.load(agentRef);
        const config = AgentEmail.make({ handle: 'kai' });
        Obj.update(config, (config) => {
          config.claimedHandle = 'kai-old';
        });
        const channel = yield* Database.add(Channel.make({ backend: { kind: AgentEmail.BACKEND_KIND, config } }));
        yield* Database.add(AgentChannels.make({ agent, channels: [channel] }));
        yield* Database.add(Obj.make(Person.Person, { fullName: 'Rich', emails: [{ value: 'rich@braneframe.com' }] }));
        yield* Database.flush();
        const { db } = yield* Database.Service;

        const contact = yield* Operation.invoke(EmailOperation.Send, {
          agent: agentRef,
          to: 'Rich@braneframe.com',
          subject: 'Ready',
          text: 'The agent is ready.',
        });
        yield* Operation.invoke(EmailOperation.Send, {
          agent: agentRef,
          to: 'stranger@example.com',
          subject: 'Re: Hello',
          text: 'Hi.',
          thread: 't1',
        });

        expect(contact).toEqual({ message: '<1@dx.pub>', thread: 'new-thread' });
        expect(sent).toEqual([
          {
            handle: 'kai-old',
            spaceId: db.spaceId,
            to: 'rich@braneframe.com',
            subject: 'Ready',
            text: 'The agent is ready.',
            thread: undefined,
            correspondentOnly: false,
          },
          {
            handle: 'kai-old',
            spaceId: db.spaceId,
            to: 'stranger@example.com',
            subject: 'Re: Hello',
            text: 'Hi.',
            thread: 't1',
            correspondentOnly: true,
          },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
