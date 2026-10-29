//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Hypergraph } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Text } from '@dxos/schema';
import { Message, Person } from '@dxos/types';

import { ChatParticipant, Mode } from '#types';

import { makeAgent } from './create-agent.ts';
import { ensureParticipantChat } from './ensure-participant-chat.ts';

const TYPES = [
  Agent.Agent,
  Chat.Chat,
  Skill.Skill,
  Feed.Feed,
  Text.Text,
  Instructions.Instructions,
  Mode.Mode,
  Person.Person,
  Message.Message,
];

const MEMBER = 'did:halo:alice';

describe("A person's chat with an agent", () => {
  let builder: EchoTestBuilder;
  let peer: EchoTestPeer;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    peer = await builder.createPeer({ types: TYPES, assignQueuePositions: true });
  });

  afterEach(async () => {
    await builder.close();
  });

  test("of a member's two private chats with the agent, the one they last talked in opens", async ({ expect }) => {
    const db = await peer.createDatabase();
    const run = <A, E>(effect: Effect.Effect<A, E, Database.Service>): Promise<A> =>
      EffectEx.runPromise(
        effect.pipe(
          Effect.provideService(Database.Service, Database.makeService(db)),
          Effect.provideService(Hypergraph.Service, Hypergraph.makeService(peer.client.graph)),
          Effect.orDie,
        ),
      );
    const agent = await run(makeAgent({ name: 'Kai' }));
    const person = await run(
      Database.add(Person.make({ identities: [{ label: ChatParticipant.IDENTITY_LABEL, value: MEMBER }] })),
    );
    const open = () => run(ensureParticipantChat(agent, person, { owner: MEMBER }));
    const say = (chat: Chat.Chat, text: string, created: string) =>
      run(
        Effect.gen(function* () {
          const feed = yield* Database.load(chat.feed);
          yield* Feed.append(feed, [
            Message.make({ created, sender: { role: 'user' }, blocks: [{ _tag: 'text', text }] }),
          ]);
        }),
      );

    // Two opens at once each make a chat, as two devices can.
    const [first, second] = await Promise.all([open(), open()]);
    expect(second.id).not.toBe(first.id);

    await say(second, 'Our offsite is in Lisbon.', '2026-10-19T10:00:00.000Z');
    expect((await open()).id).toBe(second.id);

    await say(first, 'It is on May 12.', '2026-10-19T11:00:00.000Z');
    expect((await open()).id).toBe(first.id);

    // 12:30 at +02:00 is 10:30 UTC, before the message above.
    await say(second, 'See you there.', '2026-10-19T12:30:00.000+02:00');
    expect((await open()).id).toBe(first.id);

    // An empty owner is no owner, which a relay gives: it reaches the member's latest chat rather than making one.
    expect((await run(ensureParticipantChat(agent, person, { owner: '' }))).id).toBe(first.id);
  });
});
