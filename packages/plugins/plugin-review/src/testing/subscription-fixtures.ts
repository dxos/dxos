//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { onTestFinished } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Client } from '@dxos/client';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { DXN, Feed, Obj, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as Harness from '@dxos/plugin-testing/Harness';
import { AnchoredTo, Message, Task, Thread } from '@dxos/types';

import * as ReviewPlugin from '#meta';

const TYPES = [AnchoredTo.AnchoredTo, Feed.Feed, Message.Message, Task.Task, Thread.Thread];

export type SentNotification = { recipientDid: string; message: Message.Message };

const makeHostPlugin = (client: Client, sender: AppCapabilities.InboxSender) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.host'), name: 'Host' })).pipe(
    Plugin.addModule({
      id: 'host',
      provides: [AppCapabilities.InboxSender, ClientCapabilities.Client],
      activatesOn: ActivationEvents.Startup,
      activate: () =>
        Effect.succeed([
          Capability.contribute(AppCapabilities.InboxSender, sender),
          Capability.contribute(ClientCapabilities.Client, client),
        ]),
    }),
    Plugin.make,
  );

export const preloadSubscriptionHarness = () => Harness.preload({ plugins: [ReviewPlugin.make()] });

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
  const sender: AppCapabilities.InboxSender = {
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
