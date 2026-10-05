//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, onTestFinished, test } from 'vitest';

import { Client } from '@dxos/client';
import { MemoryEdgeInbox } from '@dxos/client-services/testing';
import { type Space } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { Database, Feed, Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Message } from '@dxos/types';

import { Notifications } from '#types';

import { startInboxMaterializer } from './inbox-materializer.ts';
import { makeSender } from './sender.ts';

const TYPES = [Feed.Feed, Message.Message, Notifications.Notifications];

const createClients = async () => {
  const inboxRelay = new MemoryEdgeInbox();
  const testBuilder = new TestBuilder();
  onTestFinished(() => testBuilder.destroy());
  const clients = await Promise.all(
    [0, 1].map(async () => {
      const client = new Client({ services: testBuilder.createLocalClientServices({ inboxRelay }), types: TYPES });
      await client.initialize();
      onTestFinished(() => client.destroy());
      await client.halo.createIdentity();
      return client;
    }),
  );

  // Sharing a space makes the two identities contacts.
  const [alice, bob] = clients;
  const shared = await alice.spaces.create();
  await Promise.all(performInvitation({ host: shared, guest: bob.spaces }));
  return { alice, bob, inboxRelay };
};

const storedMessages = async (space: Space) => {
  const [notifications] = await space.db.query(Filter.type(Notifications.Notifications)).run();
  if (!notifications) {
    return [];
  }
  const feed = await notifications.feed.load();
  return EffectEx.runAndForwardErrors(
    Feed.query(feed, Filter.type(Message.Message)).run.pipe(Effect.provide(Database.layer(space.db))),
  );
};

describe('Sender', () => {
  test('delivers a message to a contact’s notifications feed', async ({ expect }) => {
    const { alice, bob, inboxRelay } = await createClients();
    const bobSpace = await bob.spaces.create();
    await bobSpace.waitUntilReady();
    const written: Message.Message[] = [];
    const { stop } = startInboxMaterializer({
      client: bob,
      getSpace: () => bobSpace,
      onWritten: (message) => written.push(message),
    });
    onTestFinished(stop);

    await expect.poll(() => alice.halo.contacts.get().length).toEqual(1);
    const bobDid = bob.halo.identity.get()?.did;
    invariant(bobDid);
    const sender = makeSender(() => alice.halo);
    await EffectEx.runAndForwardErrors(
      sender.send(bobDid, Message.make({ sender: { name: 'Alice' }, blocks: [{ _tag: 'text', text: 'Review this' }] })),
    );

    await expect.poll(async () => (await storedMessages(bobSpace)).length).toEqual(1);
    const [stored] = await storedMessages(bobSpace);
    expect(Message.extractText(stored)).toEqual('Review this');
    expect(stored.sender.identityDid).toEqual(alice.halo.identity.get()?.did);
    expect(written.map((message) => message.id)).toEqual([stored.id]);
    // Acked once stored, so the relay holds nothing more for Bob.
    await expect.poll(() => [...inboxRelay.notices.values()].flat().length).toEqual(0);
  });

  test('fails with a typed error for a non-contact or an oversized message', async ({ expect }) => {
    const { alice, bob } = await createClients();
    await expect.poll(() => alice.halo.contacts.get().length).toEqual(1);
    const sender = makeSender(() => alice.halo);

    const unknown = await EffectEx.runPromise(
      Effect.flip(sender.send('did:halo:nobody', Message.make({ sender: {} }))),
    );
    expect(unknown._tag).toEqual('UnknownRecipientError');

    const bobDid = bob.halo.identity.get()?.did;
    invariant(bobDid);
    const large = Message.make({ sender: {}, blocks: [{ _tag: 'text', text: 'x'.repeat(32 * 1024) }] });
    const tooLarge = await EffectEx.runPromise(Effect.flip(sender.send(bobDid, large)));
    expect(tooLarge._tag).toEqual('InboxPayloadTooLargeError');
  });

  test('fails with a typed error when EDGE refuses an identity without an account', async ({ expect }) => {
    const { alice, bob, inboxRelay } = await createClients();
    await expect.poll(() => alice.halo.contacts.get().length).toEqual(1);
    const aliceDid = alice.halo.identity.get()?.did;
    const bobDid = bob.halo.identity.get()?.did;
    invariant(aliceDid && bobDid);
    inboxRelay.accountless.add(aliceDid);

    const sender = makeSender(() => alice.halo);
    const error = await EffectEx.runPromise(Effect.flip(sender.send(bobDid, Message.make({ sender: {} }))));
    expect(error._tag).toEqual('InboxAccountRequiredError');
  });

  test('a recipient without an account sees the inbox as unavailable', async ({ expect }) => {
    const { alice, bob, inboxRelay } = await createClients();
    await expect.poll(() => alice.halo.contacts.get().length).toEqual(1);
    const bobDid = bob.halo.identity.get()?.did;
    invariant(bobDid);
    expect(bob.halo.inbox.status.get()).toEqual('available');
    inboxRelay.accountless.add(bobDid);

    // The delivery rings Bob's devices, whose pull EDGE then refuses.
    await EffectEx.runAndForwardErrors(makeSender(() => alice.halo).send(bobDid, Message.make({ sender: {} })));
    await expect.poll(() => bob.halo.inbox.status.get()).toEqual('account-required');
  });
});
