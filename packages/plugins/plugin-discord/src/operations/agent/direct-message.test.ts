//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/compute/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken } from '@dxos/link';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import * as AgentOperation from '@dxos/plugin-agent/AgentOperation';
import { Channel, Person } from '@dxos/types';

import { DiscordBot, DiscordChannel } from '#types';

import directMessage from './direct-message.ts';

const TestLayer = TestDatabaseLayer({
  types: [
    Agent.Agent,
    Instructions.Instructions,
    AgentChannels.AgentChannels,
    Channel.Channel,
    DiscordChannel.DiscordChannel,
    AccessToken.AccessToken,
    Person.Person,
  ],
});

describe('DirectMessage', () => {
  it.effect("posts through the bot, then records what it sent in the DM's chat", () =>
    Effect.gen(function* () {
      const agent = yield* Database.add(
        Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(Instructions.make({ name: 'Kai', text: '' })) }),
      );
      const token = yield* Database.add(Obj.make(AccessToken.AccessToken, { source: 'discord.com', token: 'x' }));
      const discord = yield* Database.add(
        Channel.make({
          backend: {
            kind: DiscordChannel.BACKEND_KIND,
            config: DiscordChannel.make({ accessToken: Ref.make(token), applicationId: 'app-1' }),
          },
        }),
      );
      yield* Database.add(AgentChannels.make({ agent, channels: [discord] }));
      yield* Database.flush();

      const acts: DiscordBot.Action[] = [];
      const invoked: { key: string; input: unknown }[] = [];
      const result = yield* directMessage
        .handler({ agent: Ref.make(agent), to: '111111111111111111', text: 'Which day is the demo?' })
        .pipe(
          Effect.provideService(DiscordBot.DiscordBotService, {
            act: (_bot, action) =>
              Effect.sync(() => {
                acts.push(action);
                return { channelId: 'dm-1', messageId: 'message-1' };
              }),
            findMembers: () => Effect.succeed([]),
          }),
          Effect.provideService(Operation.Service, {
            invoke: (op, ...args) => {
              invoked.push({ key: op.meta.key, input: args[0] });
              const output: unknown = { chat: Ref.make(agent) };
              return Schema.is(op.output)(output) ? Effect.succeed(output) : Effect.die('unexpected output');
            },
            schedule: () => Effect.void,
            invokePromise: async () => ({ error: new Error('unused') }),
          }),
        );

      expect(result).toEqual({ channel: 'dm-1', message: 'message-1' });
      expect(acts).toEqual([{ kind: 'dm', userId: '111111111111111111', text: 'Which day is the demo?' }]);
      // Recorded after the post, in the chat keyed by the DM channel the post opened, with the bot's receipt.
      expect(invoked).toHaveLength(1);
      expect(invoked[0].key).toBe(AgentOperation.RecordChannelSend.meta.key);
      expect(invoked[0].input).toMatchObject({
        thread: 'dm-1',
        text: 'Which day is the demo?',
        properties: { discord: { channelId: 'dm-1', messageId: 'message-1' } },
      });
      expect(invoked[0].input).toMatchObject({ channel: { uri: Ref.make(discord).uri } });
    }).pipe(Effect.provide(TestLayer)),
  );
});
