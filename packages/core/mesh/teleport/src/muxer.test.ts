import { Muxer } from './muxer';
import { afterTest } from '@dxos/testutils'

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

describe.skip('Muxer', () => {
  it('1 channel with 1 stream', () => {
    const { peer1, peer2 } = setupPeers();
    // peer1.createChannel('dxos.test.extension1', channel => {
    //   const stream = channel.
    // })
  });
});
