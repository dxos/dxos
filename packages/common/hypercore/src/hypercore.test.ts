//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import expect from 'expect';
import Hypercore from 'hypercore';

import { sha256 } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createStorage, RandomAccessFileConstructor, StorageType } from '@dxos/random-access-storage';

// TODO(burdon): Factor out to RAF.
const createRaf = (): RandomAccessFileConstructor => {
  const dir = createStorage({ type: StorageType.RAM }).createDirectory('/');
  return (filename: string) => dir.createOrOpenFile(filename).storage;
};

describe('Hypercore', function () {
  it('construct, open and close', async function () {
    const key = sha256(PublicKey.random().toHex());
    const storage = createRaf();

    const feed = new Hypercore(storage, key);
    expect(feed.opened).toBeFalsy();

    await feed.open();
    expect(feed.opened).toBeTruthy();

    await feed.close();
    // expect(feed.opened).toBeFalsy();
  });
});
