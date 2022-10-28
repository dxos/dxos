//
// Copyright 2022 DXOS.org
//

import { afterTest } from '@dxos/testutils';

import { Muxer } from './muxer';

const setupPeers = () => {
  const peer1 = new Muxer();
  const peer2 = new Muxer();

  peer1.stream.pipe(peer2.stream).pipe(peer1.stream);

  const unpipe = () => {
    peer1.stream.unpipe(peer2.stream);
    peer2.stream.unpipe(peer1.stream);
  };
  afterTest(unpipe);

  return {
    peer1,
    peer2,
    unpipe
  };
};

describe.skip('Muxer', function () {
  it('1 channel with 1 stream', function () {
    const { peer1, peer2 } = setupPeers();
    // peer1.createChannel('dxos.test.extension1', channel => {
    //   const stream = channel.
    // })
  });
});
