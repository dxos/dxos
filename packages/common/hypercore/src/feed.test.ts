//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import hypercore from 'hypercore';
import pify from 'pify';

import { sha256 } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';

import { createRaf } from './util';

chai.use(chaiAsPromised);

describe('Feed', function () {
  it('construct, open and close', async function () {
    const key = sha256(PublicKey.random().toHex());
    const storage = createRaf();

    const raw = hypercore(storage, key);
    const feed = pify(raw);

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
    console.log(feed.opened, feed.closed);
    expect(feed.opened).to.be.true; // Expected.
    expect(feed.closed).to.be.true;

    // Can be called multiple times.
    await feed.close();

    // Cannot be reopened.
    await expect(feed.open()).to.be.rejectedWith(Error);
  });
});
