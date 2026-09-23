//
// Copyright 2022 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { createBuf, fromTimeframe } from '@dxos/protocols/buf';
import { FeedMessageSchema } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import { createStorage } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';

import { TestAgentBuilder, TestFeedBuilder } from './testing/index.ts';

describe('space/space-protocol', () => {
  // TODO(dmaretskyi): Fails with the vscode test-runner for some reason.
  test('two peers discover each other', async () => {
    const builder = new TestAgentBuilder();
    onTestFinished(async () => {
      await builder.close();
    });
    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const gossip1 = peer1.createGossip();
    const presence1 = peer1.createPresence(gossip1);
    const protocol1 = peer1.createSpaceProtocol(topic, gossip1);

    const peer2 = await builder.createPeer();
    const gossip2 = peer2.createGossip();
    const presence2 = peer2.createPresence(gossip2);
    const protocol2 = peer2.createSpaceProtocol(topic, gossip2);

    await protocol1.start(Context.default());
    await protocol2.start(Context.default());

    onTestFinished(() => protocol1.stop(Context.default()));
    onTestFinished(() => protocol2.stop(Context.default()));

    await expect.poll(() => presence1.getPeersByIdentityKey(peer2.identityKey).length > 0).toBeTruthy();
    await expect.poll(() => presence2.getPeersByIdentityKey(peer1.identityKey).length > 0).toBeTruthy();
  });

  test('replicates a feed', async () => {
    const builder = new TestAgentBuilder();
    onTestFinished(async () => {
      await builder.close();
    });
    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const protocol1 = peer1.createSpaceProtocol(topic);

    const peer2 = await builder.createPeer();
    const protocol2 = peer2.createSpaceProtocol(topic);

    await protocol1.start(Context.default());
    await protocol2.start(Context.default());

    onTestFinished(() => protocol1.stop(Context.default()));
    onTestFinished(() => protocol2.stop(Context.default()));

    const builder1 = new TestFeedBuilder();
    const hypercoreStore1 = builder1.createHypercoreStore();

    const builder2 = new TestFeedBuilder();
    const hypercoreStore2 = builder2.createHypercoreStore();

    const feedKey = await builder1.keyring.createKey();
    const feed1 = await hypercoreStore1.openHypercore(feedKey, { writable: true });
    const feed2 = await hypercoreStore2.openHypercore(feedKey);

    await protocol1.addHypercore(feed1);
    await protocol2.addHypercore(feed2);

    await feed1.append(createBuf(FeedMessageSchema, { timeframe: fromTimeframe(new Timeframe()) }));
    await expect.poll(() => feed2.properties.length).toEqual(1);

    await feed1.append(createBuf(FeedMessageSchema, { timeframe: fromTimeframe(new Timeframe()) }));
    await expect.poll(() => feed2.properties.length).toEqual(2);

    await builder.close();
  });

  // TODO: Some storage drivers may break when there are multiple storage instances.
  test.skip('replicates a feed through a webrtc connection', async () => {
    const builder = new TestAgentBuilder({
      storage: createStorage(),
    });
    onTestFinished(async () => {
      await builder.close();
    });

    const keyring = new Keyring();
    const topic = await keyring.createKey();

    const peer1 = await builder.createPeer();
    const protocol1 = peer1.createSpaceProtocol(topic);

    const peer2 = await builder.createPeer();
    const protocol2 = peer2.createSpaceProtocol(topic);

    await protocol1.start(Context.default());
    await protocol2.start(Context.default());

    onTestFinished(() => protocol1.stop(Context.default()));
    onTestFinished(() => protocol2.stop(Context.default()));

    const feedKey = await peer1.keyring.createKey();

    const feed1 = await peer1.hypercoreStore.openHypercore(feedKey, { writable: true });
    const feed2 = await peer2.hypercoreStore.openHypercore(feedKey);

    await protocol1.addHypercore(feed1);
    await protocol2.addHypercore(feed2);

    await feed1.append(createBuf(FeedMessageSchema, { timeframe: fromTimeframe(new Timeframe()) }));
    await expect.poll(() => feed2.properties.length).toEqual(1);

    await feed1.append(createBuf(FeedMessageSchema, { timeframe: fromTimeframe(new Timeframe()) }));
    await expect.poll(() => feed2.properties.length).toEqual(2);

    await builder.close();
  });
});
