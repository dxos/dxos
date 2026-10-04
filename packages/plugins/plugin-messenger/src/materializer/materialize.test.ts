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

const runEffect = <A, E>(db: EchoDatabase, effect: Effect.Effect<A, E, Database.Service>) =>
  EffectEx.runAndForwardErrors(effect.pipe(Effect.provide(Database.layer(db))));

/** What a reader sees: every container's messages, collapsed by envelope, with merged read state. */
const visible = async (db: EchoDatabase) => {
  const containers = Notifications.order(await db.query(Filter.type(Notifications.Notifications)).run());
  const feeds = await Promise.all(containers.map((container) => container.feed.load()));
  const messages = await db.query(Notifications.messagesQuery(feeds)).run();
  const { messages: unique, read } = Notifications.view(messages, Notifications.readKeys(containers));
  return {
    containers: containers.length,
    texts: unique.map((message) => Message.extractText(message)).toSorted(),
    read: unique.flatMap((message) => (read.has(message.id) ? [Message.extractText(message)] : [])).toSorted(),
  };
};

/** Simulates a device that materialized before it saw any other device's container. */
const writeOwnContainer = async (db: EchoDatabase, envelopes: { id: string; text: string; read?: boolean }[]) => {
  const notifications = db.add(Notifications.make());
  const feed = await notifications.feed.load();
  const messages = envelopes.map(({ id, text }) =>
    Message.make({
      sender: { name: 'Alice' },
      blocks: [{ _tag: 'text', text }],
      [Obj.Meta]: { keys: [{ source: Notifications.INBOX_KEY_SOURCE, id }] },
    }),
  );
  await runEffect(db, Feed.append(feed, messages));
  Notifications.markRead(
    [notifications],
    messages.filter((_, index) => envelopes[index].read),
  );
  await db.flush();
};

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

  test('containers two devices created concurrently converge into one, losing and repeating nothing', async ({
    expect,
  }) => {
    const { db, peer, key } = await builder.createDatabase({ types: TYPES });
    const otherDevice = await peer.openDatabase(key, undefined, { client: await peer.createClient() });

    // Both devices received e1 before either saw the other's container; each read a different message.
    await Promise.all([
      writeOwnContainer(db, [
        { id: 'e1', text: 'one', read: true },
        { id: 'e2', text: 'two' },
      ]),
      writeOwnContainer(otherDevice, [
        { id: 'e1', text: 'one' },
        { id: 'e3', text: 'three', read: true },
      ]),
    ]);
    await expect.poll(async () => (await visible(db)).containers).toEqual(2);
    await expect.poll(async () => (await visible(otherDevice)).containers).toEqual(2);

    // Until they converge, readers see the union, each message once.
    expect(await visible(db)).toEqual({ containers: 2, texts: ['one', 'three', 'two'], read: ['one', 'three'] });

    // Both devices converge at once; a redelivered envelope held only by the other container is not rewritten.
    const [first] = await Promise.all([
      run(db, {
        messages: [inboxMessage('e3', CONTACT_KEY), inboxMessage('e4', CONTACT_KEY, 'four')],
        contacts,
        ack: async () => {},
      }),
      runEffect(otherDevice, Notifications.converge()),
    ]);
    expect(first.written.map((message) => Message.extractText(message))).toEqual(['four']);

    const expected = { containers: 1, texts: ['four', 'one', 'three', 'two'], read: ['one', 'three'] };
    await expect.poll(() => visible(db)).toEqual(expected);
    await expect.poll(() => visible(otherDevice)).toEqual(expected);

    // Running again on either device folds any concurrent copies away and changes nothing visible.
    await runEffect(db, Notifications.converge());
    await runEffect(otherDevice, Notifications.converge());
    await expect.poll(async () => (await storedMessages(db)).length).toEqual(4);
    await expect.poll(() => visible(otherDevice)).toEqual(expected);
  });

  test('a message written to a container after another device deleted it is still moved, once', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: TYPES });
    await writeOwnContainer(db, [{ id: 'e1', text: 'one', read: true }]);
    await writeOwnContainer(db, [{ id: 'e2', text: 'two', read: true }]);
    const [, loser] = Notifications.order(await db.query(Filter.type(Notifications.Notifications)).run());
    const loserFeed = await loser.feed.load();
    await runEffect(db, Notifications.converge());
    expect((await visible(db)).read).toEqual(['one', 'two']);

    // Marking a moved message unread sticks, though the deleted container still records it read.
    const containers = await db.query(Filter.type(Notifications.Notifications)).run();
    Notifications.markUnread(containers, await storedMessages(db));
    await runEffect(db, Notifications.converge());
    expect((await visible(db)).read).toEqual([]);

    // The device that created the loser had not yet seen the deletion.
    const late = Message.make({
      sender: { name: 'Alice' },
      blocks: [{ _tag: 'text', text: 'late' }],
      [Obj.Meta]: { keys: [{ source: Notifications.INBOX_KEY_SOURCE, id: 'e3' }] },
    });
    await runEffect(db, Feed.append(loserFeed, [late]));
    await runEffect(db, Notifications.converge());
    expect(await visible(db)).toEqual({ containers: 1, texts: ['late', 'one', 'two'], read: [] });

    // Deleting a moved message does not bring it back from the deleted container.
    const lateCopy = (await storedMessages(db)).find((message) => Message.extractText(message) === 'late');
    expect(lateCopy).toBeDefined();
    await runEffect(db, Notifications.remove(containers, lateCopy ? [lateCopy] : []));
    await runEffect(db, Notifications.converge());
    expect((await visible(db)).texts).toEqual(['one', 'two']);
  });
});
