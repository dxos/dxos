//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { InboxService } from '@dxos/protocols/rpc';
import { Message } from '@dxos/types';

import { Notifications } from '#types';

import { type MaterializeProps, materialize } from './materialize.ts';

const TYPES = [Feed.Feed, Message.Message, Notifications.Notifications];

const CONTACT_KEY = PublicKey.random();
const CONTACT_DID = 'did:halo:contact';
const STRANGER_KEY = PublicKey.random();

const contacts: MaterializeProps['contacts'] = new Map([[CONTACT_KEY.toHex(), { did: CONTACT_DID }]]);

const inboxMessage = (id: string, sender: PublicKey, text = `message ${id}`): InboxService.InboxMessage => ({
  id,
  senderIdentityKey: sender,
  type: InboxService.INBOX_MESSAGE_TYPE,
  payload: Message.encodeJson(
    Message.make({ sender: { identityDid: 'did:halo:claimed', name: 'Alice' }, blocks: [{ _tag: 'text', text }] }),
  ),
  sentAt: new Date(),
});

const run = (db: EchoDatabase, props: MaterializeProps) =>
  EffectEx.runAndForwardErrors(materialize(props).pipe(Effect.provide(Database.layer(db))));

const storedMessages = async (db: EchoDatabase) => {
  const [notifications] = await db.query(Filter.type(Notifications.Notifications)).run();
  if (!notifications) {
    return [];
  }
  const feed = await notifications.feed.load();
  return EffectEx.runAndForwardErrors(
    Feed.query(feed, Filter.type(Message.Message)).run.pipe(Effect.provide(Database.layer(db))),
  );
};

describe('materialize', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('writes contacts’ messages, attributed to the verified sender, then acks them', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: TYPES });
    const acks: string[][] = [];
    const result = await run(db, {
      messages: [inboxMessage('e1', CONTACT_KEY, 'hello')],
      contacts,
      ack: async (ids) => {
        // Ack only after the write: the message must already be stored when the relay forgets it.
        expect((await storedMessages(db)).map((message) => Message.extractText(message))).toEqual(['hello']);
        acks.push([...ids]);
      },
    });

    expect(result.acked).toEqual(['e1']);
    expect(acks).toEqual([['e1']]);
    const [stored] = await storedMessages(db);
    expect(stored.sender.identityDid).toEqual(CONTACT_DID);
    expect(stored.sender.name).toEqual('Alice');
    expect(Obj.getMeta(stored).keys).toContainEqual({ source: Notifications.INBOX_KEY_SOURCE, id: 'e1' });
  });

  test('leaves messages from non-contacts pending and creates nothing for them', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: TYPES });
    const acks: string[][] = [];
    const result = await run(db, {
      messages: [inboxMessage('e1', STRANGER_KEY), { ...inboxMessage('e2', CONTACT_KEY), type: 'org.example.other' }],
      contacts,
      ack: async (ids) => {
        acks.push([...ids]);
      },
    });

    expect(result).toEqual({ written: [], acked: [] });
    expect(acks).toEqual([]);
    expect(await db.query(Filter.type(Notifications.Notifications)).run()).toHaveLength(0);
  });

  test('acks an undecodable payload without storing it', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: TYPES });
    const result = await run(db, {
      messages: [{ ...inboxMessage('e1', CONTACT_KEY), payload: '{not json' }],
      contacts,
      ack: async () => {},
    });

    expect(result).toEqual({ written: [], acked: ['e1'] });
    expect(await storedMessages(db)).toHaveLength(0);
  });

  test('a redelivered envelope is acked but stored once, across two devices of one space', async ({ expect }) => {
    const { db, peer, key } = await builder.createDatabase({ types: TYPES });
    const otherDevice = await peer.openDatabase(key, undefined, { client: await peer.createClient() });
    const messages = [inboxMessage('e1', CONTACT_KEY), inboxMessage('e2', CONTACT_KEY)];

    const first = await run(db, { messages, contacts, ack: async () => {} });
    expect(first.written).toHaveLength(2);

    // The ack failed to reach the relay, so the other device receives the same envelopes.
    await expect.poll(async () => (await storedMessages(otherDevice)).length).toEqual(2);
    const second = await run(otherDevice, { messages, contacts, ack: async () => {} });
    expect(second).toEqual({ written: [], acked: ['e1', 'e2'] });
    expect(await storedMessages(db)).toHaveLength(2);
    expect(await db.query(Filter.type(Notifications.Notifications)).run()).toHaveLength(1);
  });
});
