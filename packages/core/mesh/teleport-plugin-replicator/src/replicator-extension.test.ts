//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Event, sleep } from '@dxos/async';
import { createReplicatorPair, TestBuilder } from './testing';

describe('ReplicatorExtension', function () {
  it('replicates a feed', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { replicator1, replicator2 } = await createReplicatorPair();

    replicator1.setOptions({ upload: true });
    replicator2.setOptions({ upload: true });

    const feed1 = await agent1.createWriteFeed(10);
    const feed2 = await agent2.createReadFeed(feed1.key);

    replicator1.addFeed(feed1);
    replicator2.addFeed(feed2);

    await Event.wrap(feed2, 'download').waitForCondition(() => feed2.length === 10);
  });

  it('does not upload data when upload is off', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { replicator1, replicator2 } = await createReplicatorPair();

    replicator1.setOptions({ upload: false });
    replicator2.setOptions({ upload: true });

    const feed1 = await agent1.createWriteFeed(10);
    const feed2 = await agent2.createReadFeed(feed1.key);

    replicator1.addFeed(feed1);
    replicator2.addFeed(feed2);

    // Wait for events to be processed.
    await sleep(5);

    expect(feed2.length).toEqual(0);
  });

  it('selectively replicates 2 feeds in both directions', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { replicator1, replicator2 } = await createReplicatorPair();

    replicator1.setOptions({ upload: false });
    replicator2.setOptions({ upload: true });

    const feed1A = await agent1.createWriteFeed(10);
    replicator1.addFeed(feed1A);
    const feed2A = await agent2.createReadFeed(feed1A.key);
    replicator2.addFeed(feed2A);

    const feed2B = await agent2.createWriteFeed(10);
    replicator2.addFeed(feed2B);
    const feed1B = await agent2.createReadFeed(feed2B.key);
    replicator1.addFeed(feed2B);

    // Wait for events to be processed.
    await Event.wrap(feed1B, 'download').waitForCondition(() => feed1B.length === 10);
    await sleep(5);

    expect(feed2A.length).toEqual(0);
  });

  it('add another feed mid replication', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { replicator1, replicator2 } = await createReplicatorPair();

    replicator1.setOptions({ upload: true });
    replicator2.setOptions({ upload: true });

    const feed1A = await agent1.createWriteFeed(10);
    replicator1.addFeed(feed1A);
    const feed2A = await agent2.createReadFeed(feed1A.key);
    replicator2.addFeed(feed2A);

    await Event.wrap(feed2A, 'download').waitForCondition(() => feed2A.length === 10);

    const feed2B = await agent2.createWriteFeed(10);
    replicator2.addFeed(feed2B);
    const feed1B = await agent2.createReadFeed(feed2B.key);
    replicator1.addFeed(feed2B);

    await Event.wrap(feed1B, 'download').waitForCondition(() => feed1B.length === 10);
  });

  // TODO: not working yet.
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('enabling upload mid replication', async function () {
    const builder = new TestBuilder();
    const agent1 = builder.createAgent();
    const agent2 = builder.createAgent();

    const { replicator1, replicator2 } = await createReplicatorPair();

    replicator1.setOptions({ upload: false });
    replicator2.setOptions({ upload: true });

    const feed1A = await agent1.createWriteFeed(10);
    replicator1.addFeed(feed1A);
    const feed2A = await agent2.createReadFeed(feed1A.key);
    replicator2.addFeed(feed2A);

    const feed2B = await agent2.createWriteFeed(10);
    replicator2.addFeed(feed2B);
    const feed1B = await agent2.createReadFeed(feed2B.key);
    replicator1.addFeed(feed2B);

    // Wait for events to be processed.
    await Event.wrap(feed1B, 'download').waitForCondition(() => feed1B.length === 10);
    await sleep(5);

    expect(feed2A.length).toEqual(0);

    replicator1.setOptions({ upload: true });

    // Wait for events to be processed.
    await Event.wrap(feed2A, 'download').waitForCondition(() => feed2A.length === 10);
  });
});
