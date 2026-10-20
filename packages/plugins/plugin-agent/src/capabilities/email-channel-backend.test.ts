//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Channel } from '@dxos/types';

import { AgentChannels, AgentEmail, AgentMailbox } from '#types';

import { UNAVAILABLE_STATUS, makeEmailChannelBackend, toConnectionStatus } from './email-channel-backend.ts';

type Call = { op: 'claim' | 'release' | 'status'; handle: string; request?: AgentMailbox.ClaimRequest };

/** Records each call and answers as a mailbox held by `spaceId`. */
const fakeMailbox = (spaceId: () => string) => {
  const calls: Call[] = [];
  const answer = (handle: string) => Effect.succeed(mailbox(spaceId(), handle));
  const service: AgentMailbox.Service = {
    claim: (request) => {
      calls.push({ op: 'claim', handle: request.handle, request });
      return answer(request.handle);
    },
    release: (handle) => {
      calls.push({ op: 'release', handle });
      return answer(handle);
    },
    status: (handle) => {
      calls.push({ op: 'status', handle });
      return answer(handle).pipe(Effect.map(Option.some));
    },
    send: () => Effect.die('Not sent by the channel backend.'),
  };
  return { calls, layer: () => Layer.succeed(AgentMailbox.AgentMailboxService, service) };
};

const TestLayer = AssistantTestLayer({
  types: [Agent.Agent, Instructions.Instructions, Channel.Channel, AgentChannels.AgentChannels, AgentEmail.AgentEmail],
  disableLlmMemoization: true,
});

const withCapabilities = Effect.provideService(
  Capability.Service,
  CapabilityManager.make({ registry: Registry.make() }),
);

const mailbox = (spaceId: string, handle = 'kai'): AgentMailbox.MailboxStatus => ({
  handle,
  address: `${handle}@dxos.ai`,
  config: { spaceId, agent: 'a', channel: 'c', allowedSenders: ['dxos.org'] },
  threads: 2,
  pending: 0,
  received: 3,
  rejected: 0,
  sent: 2,
});

/** An agent listing an email channel for `handle`. */
const makeAgentChannel = Effect.fnUntraced(function* (handle: string, listed = true) {
  const instructions = yield* Database.add(Instructions.make({ text: 'Answer email.' }));
  const agent = yield* Database.add(Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(instructions) }));
  const config = AgentEmail.make({ handle, displayName: 'Kai' });
  const channel = yield* Database.add(
    Channel.make({ name: 'email', backend: { kind: AgentEmail.BACKEND_KIND, config } }),
  );
  if (listed) {
    yield* Database.add(AgentChannels.make({ agent, channels: [channel] }));
  }
  yield* Database.flush();
  return { agent, channel, config };
});

describe('email channel backend', () => {
  it('a config defaults to the team domains and normalizes the handle', ({ expect }) => {
    const config = AgentEmail.make({ handle: ' Kai ' });
    expect(config.handle).toBe('kai');
    expect(config.allowedSenders).toEqual(['braneframe.com', 'dxos.org']);
  });

  it('reports a handle another space holds as taken', ({ expect }) => {
    expect(toConnectionStatus(mailbox('SPACE'), 'SPACE')).toMatchObject({ running: true, state: 'ready' });
    expect(toConnectionStatus(mailbox('OTHER'), 'SPACE')).toMatchObject({
      running: false,
      state: 'taken',
      error: 'kai@dxos.ai is taken.',
    });
  });

  it.effect(
    'connecting claims the address for the agent that lists the channel',
    Effect.fnUntraced(
      function* ({ expect }) {
        const spaceId = yield* Database.spaceId;
        const fake = fakeMailbox(() => spaceId);
        const connection = makeEmailChannelBackend({ mailbox: fake.layer }).connection;
        if (!connection) {
          return expect.unreachable('The email backend has a connection.');
        }
        const { agent, channel } = yield* makeAgentChannel('kai');

        const started = yield* connection.start(channel).pipe(withCapabilities);
        expect(started.running).toBe(true);
        yield* connection.stop(channel).pipe(withCapabilities);
        expect(fake.calls).toEqual([
          {
            op: 'claim',
            handle: 'kai',
            request: {
              handle: 'kai',
              spaceId,
              agent: `echo://${spaceId}/${agent.id}`,
              channel: `echo://${spaceId}/${channel.id}`,
              displayName: 'Kai',
              allowedSenders: ['braneframe.com', 'dxos.org'],
            },
          },
          { op: 'release', handle: 'kai' },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a renamed address releases the one it claimed; an empty allowlist claims with the default',
    Effect.fnUntraced(
      function* ({ expect }) {
        const spaceId = yield* Database.spaceId;
        const fake = fakeMailbox(() => spaceId);
        const connection = makeEmailChannelBackend({ mailbox: fake.layer }).connection;
        if (!connection) {
          return expect.unreachable('The email backend has a connection.');
        }
        const { channel, config } = yield* makeAgentChannel('kai');

        yield* connection.start(channel).pipe(withCapabilities);
        Obj.update(config, (config) => {
          config.handle = 'kai2';
          config.allowedSenders = [];
        });
        yield* connection.status(channel).pipe(withCapabilities);
        yield* connection.start(channel).pipe(withCapabilities);
        yield* connection.stop(channel).pipe(withCapabilities);

        expect(fake.calls.map(({ op, handle }) => `${op} ${handle}`)).toEqual([
          'claim kai',
          // Until reconnected, the status is the claimed mailbox's, not the edited address's.
          'status kai',
          'release kai',
          'claim kai2',
          'release kai2',
        ]);
        expect(fake.calls[3]?.request?.allowedSenders).toEqual(['braneframe.com', 'dxos.org']);
        expect(config.claimedHandle).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a channel no agent lists cannot connect',
    Effect.fnUntraced(
      function* ({ expect }) {
        const fake = fakeMailbox(() => 'SPACE');
        const connection = makeEmailChannelBackend({ mailbox: fake.layer }).connection;
        if (!connection) {
          return expect.unreachable('The email backend has a connection.');
        }
        const { channel } = yield* makeAgentChannel('kai', false);
        const error = yield* Effect.flip(connection.start(channel).pipe(withCapabilities));
        expect(error.message).toBe('Add the channel to an agent before connecting it.');
        expect(fake.calls).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a mailbox EDGE does not serve reads as unavailable, not as a failure',
    Effect.fnUntraced(
      function* ({ expect }) {
        const unserved: AgentMailbox.Service = {
          claim: () => Effect.die('Not claimed in this test.'),
          release: () => Effect.die('Not released in this test.'),
          status: () => Effect.succeed(Option.none()),
          send: () => Effect.die('Not sent by the channel backend.'),
        };
        const connection = makeEmailChannelBackend({
          mailbox: () => Layer.succeed(AgentMailbox.AgentMailboxService, unserved),
        }).connection;
        if (!connection) {
          return expect.unreachable('The email backend has a connection.');
        }
        const { channel } = yield* makeAgentChannel('kai');
        expect(yield* connection.status(channel).pipe(withCapabilities)).toEqual(UNAVAILABLE_STATUS);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
