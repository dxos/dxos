//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { onTestFinished } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { Client } from '@dxos/client';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { DXN, Feed, Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MessengerCapabilities from '@dxos/plugin-messenger/MessengerCapabilities';
import * as Harness from '@dxos/plugin-testing/Harness';
import { AnchoredTo, Message, Task, Thread } from '@dxos/types';

import * as ReviewPlugin from '#meta';

const TYPES = [AnchoredTo.AnchoredTo, Feed.Feed, Message.Message, Task.Task, Thread.Thread];

export type SentNotification = { recipientDid: string; message: Message.Message };

/** Contributes the commenter's client and an inbox sender that records instead of relaying. */
const makeHostPlugin = (client: Client, sender: MessengerCapabilities.Sender) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.host'), name: 'Host' })).pipe(
    Plugin.addModule({
      id: 'host',
      provides: [ClientCapabilities.Client, MessengerCapabilities.Sender],
      activatesOn: ActivationEvents.Startup,
      activate: () =>
        Effect.succeed([
          Capability.contribute(ClientCapabilities.Client, client),
          Capability.contribute(MessengerCapabilities.Sender, sender),
        ]),
    }),
    Plugin.make,
  );

export const preloadSubscriptionHarness = () => Harness.preload({ plugins: [ReviewPlugin.make()] });

/**
 * Alice and Bob share a space holding a task with one comment thread; the harness runs the review
 * operations as Alice, and `sent` collects what her inbox sender was asked to deliver.
 */
export const createSubscriptionHarness = async () => {
  const testBuilder = new TestBuilder();
  onTestFinished(() => testBuilder.destroy());
  const [alice, bob] = await Promise.all(
    [0, 1].map(async () => {
      const client = new Client({ services: testBuilder.createLocalClientServices(), types: TYPES });
      await client.initialize();
      onTestFinished(() => client.destroy());
      await client.halo.createIdentity();
      return client;
    }),
  );

  const space = await alice.spaces.create();
  await space.waitUntilReady();
  await Promise.all(performInvitation({ host: space, guest: bob.spaces }));
  const aliceDid = alice.halo.identity.get()?.did;
  const bobDid = bob.halo.identity.get()?.did;
  invariant(aliceDid && bobDid);

  const sent: SentNotification[] = [];
  const sender: MessengerCapabilities.Sender = {
    send: (recipientDid, message) => Effect.sync(() => void sent.push({ recipientDid, message })),
  };
  const harness = await Harness.createComposerTestApp({
    plugins: [makeHostPlugin(alice, sender)(), ReviewPlugin.make()],
  });
  onTestFinished(() => harness[Symbol.asyncDispose]());

  const subject = space.db.add(Task.make({ title: 'Requirements' }));
  const thread = space.db.add(Thread.make({ status: 'active' }));
  const anchor = space.db.add(
    Relation.make(AnchoredTo.AnchoredTo, { [Relation.Source]: thread, [Relation.Target]: subject }),
  );

  /** Appends a comment as `did`, as `AddMessage` does once the thread is saved. */
  const comment = async (did: string, text: string) => {
    const message = Obj.make(Message.Message, {
      created: new Date().toISOString(),
      sender: { identityDid: did, role: 'user' },
      blocks: [{ _tag: 'text', text }],
    });
    await space.db.appendToFeed(await thread.feed.load(), [message]);
    return message;
  };

  return { harness, space, bob, subject, thread, anchor, aliceDid, bobDid, sent, comment };
};
