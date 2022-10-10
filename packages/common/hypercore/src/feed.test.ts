//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Hypercore from 'hypercore';
import ram from 'random-access-memory';

// import { sha256 } from '@dxos/crypto';
// import { PublicKey } from '@dxos/keys';

import { wrapFeed } from './hypercore-feed';

chai.use(chaiAsPromised);

describe('Feed', function () {
  it('construct, open and close', async function () {
    // const key = sha256(PublicKey.random().toHex());
    const raw = new Hypercore(ram);
    const feed = wrapFeed(raw);

    expect(feed.opened).to.be.false;
    expect(feed.closed).to.be.false;

    await feed.open();
    expect(feed.opened).to.be.true;
    expect(feed.closed).to.be.false;

    // Can be called multiple times.
    await feed.open();
    expect(feed.opened).to.be.true;
    expect(feed.closed).to.be.false;

    await feed.close();
    expect(feed.opened).to.be.true; // Expected.
    expect(feed.closed).to.be.true;

    // Can be called multiple times.
    await feed.close();

    // Cannot be reopened.
    await expect(feed.open()).to.be.rejectedWith(Error);
  });

  it('writes and reads blocks', async function () {
    const raw = new Hypercore(ram);
    const feed = wrapFeed(raw);
    await feed.append('test');

    const data = await feed.get(0);
    expect(data.toString()).to.eq('test');
  });
});
