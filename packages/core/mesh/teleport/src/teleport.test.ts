//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import { pipeline } from 'stream';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { afterTest } from '@dxos/testutils';

import { Teleport } from './teleport';
import { TestExtension } from './test-extension';

const setup = () => {
  const peerId1 = PublicKey.random();
  const peerId2 = PublicKey.random();

  const peer1 = new Teleport({ initiator: true, localPeerId: peerId1, remotePeerId: peerId2 });
  const peer2 = new Teleport({ initiator: false, localPeerId: peerId2, remotePeerId: peerId1 });

  pipeline(peer1.stream, peer2.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  pipeline(peer2.stream, peer1.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  afterTest(() => peer1.close());
  afterTest(() => peer2.close());

  return { peer1, peer2 };
};

describe('Teleport', function () {
  it('sends rpc via TestExtension', async function () {
    const { peer1, peer2 } = setup();

    await Promise.all([peer1.open(), peer2.open()]);

    const extension1 = new TestExtension();
    peer1.addExtension('example.testing.rpc', extension1);
    const extension2 = new TestExtension();
    peer2.addExtension('example.testing.rpc', extension2);

    await extension1.test();
    log('test1 done');
    await extension2.test();
    log('test2 done');

    expect(extension1.extensionContext?.initiator).to.equal(true);
    expect(extension2.extensionContext?.initiator).to.equal(false);
  });
});
