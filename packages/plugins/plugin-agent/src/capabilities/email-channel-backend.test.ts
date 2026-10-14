//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { type Context } from '@dxos/context';
import { Database, Obj, Ref } from '@dxos/echo';
import { EdgeHttpClient, type EdgeRequestArgs } from '@dxos/edge-client';
import { TestHelpers } from '@dxos/effect/testing';
import { Channel } from '@dxos/types';

import { AgentChannels, AgentEmail } from '#types';

import { makeEmailChannelBackend, toConnectionStatus } from './email-channel-backend.ts';

type RecordedRequest = { path: string } & EdgeRequestArgs;

/** Records each request and answers with a canned status, standing in for EDGE's mailbox route. */
class MockEdgeHttpClient extends EdgeHttpClient {
  readonly requests: RecordedRequest[] = [];

  constructor(private readonly _response: () => AgentEmail.MailboxStatus) {
    super('http://edge.test');
  }

  override async request(_ctx: Context, path: string, args: EdgeRequestArgs): Promise<unknown> {
    this.requests.push({ path, ...args });
    return this._response();
  }
}

const TestLayer = AssistantTestLayer({
  types: [Agent.Agent, Instructions.Instructions, Channel.Channel, AgentChannels.AgentChannels, AgentEmail.AgentEmail],
  disableLlmMemoization: true,
});

const withCapabilities = Effect.provideService(
  Capability.Service,
  CapabilityManager.make({ registry: Registry.make() }),
);

const mailbox = (spaceId: string): AgentEmail.MailboxStatus => ({
  handle: 'kai',
  address: 'kai@dx.pub',
  config: { spaceId, agent: 'a', channel: 'c', allowedSenders: ['dxos.org'] },
  threads: 2,
  pending: 0,
  received: 3,
  rejected: 0,
  sent: 2,
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
      error: 'kai@dx.pub is taken.',
    });
  });

  it.effect(
    'connecting claims the address for the agent that lists the channel',
    Effect.fnUntraced(
      function* ({ expect }) {
        const spaceId = yield* Database.spaceId;
        const edge = new MockEdgeHttpClient(() => mailbox(spaceId));
        const backend = makeEmailChannelBackend({ edgeClient: Effect.succeed(edge) });
        const instructions = yield* Database.add(Instructions.make({ text: 'Answer email.' }));
        const agent = yield* Database.add(Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(instructions) }));
        const channel = yield* Database.add(
          Channel.make({
            name: 'email',
            backend: { kind: AgentEmail.BACKEND_KIND, config: AgentEmail.make({ handle: 'kai', displayName: 'Kai' }) },
          }),
        );
        yield* Database.add(AgentChannels.make({ agent, channels: [channel] }));
        yield* Database.flush();

        const connection = backend.connection;
        expect(connection).toBeDefined();
        if (!connection) {
          return;
        }
        const started = yield* connection.start(channel).pipe(withCapabilities);
        expect(started.running).toBe(true);
        yield* connection.stop(channel).pipe(withCapabilities);
        expect(edge.requests).toEqual([
          {
            path: '/email/mailboxes/kai',
            method: 'PUT',
            body: {
              spaceId,
              agent: `echo://${spaceId}/${agent.id}`,
              channel: `echo://${spaceId}/${channel.id}`,
              displayName: 'Kai',
              allowedSenders: ['braneframe.com', 'dxos.org'],
            },
          },
          { path: '/email/mailboxes/kai', method: 'DELETE' },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a channel no agent lists cannot connect',
    Effect.fnUntraced(
      function* ({ expect }) {
        const edge = new MockEdgeHttpClient(() => mailbox('SPACE'));
        const backend = makeEmailChannelBackend({ edgeClient: Effect.succeed(edge) });
        const channel = yield* Database.add(
          Channel.make({
            name: 'email',
            backend: { kind: AgentEmail.BACKEND_KIND, config: AgentEmail.make({ handle: 'kai' }) },
          }),
        );
        const connection = backend.connection;
        if (!connection) {
          return expect.unreachable('The email backend has a connection.');
        }
        const result = yield* Effect.flip(connection.start(channel).pipe(withCapabilities));
        expect(result.message).toBe('Add the channel to an agent before connecting it.');
        expect(edge.requests).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
