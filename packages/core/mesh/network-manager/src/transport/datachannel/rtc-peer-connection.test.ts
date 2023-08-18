//
// Copyright 2023 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'chai';
import nodeDataChannel from 'node-datachannel';

import { Trigger, asyncTimeout } from '@dxos/async';
import { afterTest, describe, test } from '@dxos/test';

setTimeout(() => {}, 10 * 1000);

describe('Node WebRTC libdatachannel implementation', () => {
  test
    .only('Connect two datachannel Peers', async () => {
      let dc2 = null;
      afterTest(() => dc1.close());

      const peer1 = new nodeDataChannel.PeerConnection('Peer1', { iceServers: ['stun:stun.l.google.com:19302'] });
      afterTest(() => peer2.close());

      // Set Callbacks
      peer1.onLocalDescription((sdp, type) => {
        console.log('Peer1 SDP:', sdp, ' Type:', type);
        peer2.setRemoteDescription(sdp, type);
      });
      peer1.onLocalCandidate((candidate, mid) => {
        console.log('Peer1 Candidate:', candidate);
        peer2.addRemoteCandidate(candidate, mid);
      });

      const peer2 = new nodeDataChannel.PeerConnection('Peer2', { iceServers: ['stun:stun.l.google.com:19302'] });
      afterTest(() => peer2.close());

      const msg1to2 = 'Hello from Peer1';
      const firstPeerReceived = new Trigger<string | Buffer>();
      const msg2to1 = 'Hello from Peer2';
      const secondPeerReceived = new Trigger<string | Buffer>();

      // Set Callbacks
      peer2.onLocalDescription((sdp, type) => {
        console.log('Peer2 SDP:', sdp, ' Type:', type);
        peer1.setRemoteDescription(sdp, type);
      });
      peer2.onLocalCandidate((candidate, mid) => {
        console.log('Peer2 Candidate:', candidate);
        peer1.addRemoteCandidate(candidate, mid);
      });
      peer2.onDataChannel((dc) => {
        console.log('Peer2 Got DataChannel: ', dc.getLabel());
        dc2 = dc;
        dc2.onMessage((msg) => secondPeerReceived.wake(msg));
        dc2.sendMessage(msg2to1);
      });

      const dc1 = peer1.createDataChannel('test');
      afterTest(() => dc1.close());

      dc1.onOpen(() => {
        dc1.sendMessage(msg1to2);
      });

      dc1.onMessage((msg) => firstPeerReceived.wake(msg));
      expect(await asyncTimeout(firstPeerReceived.wait(), 200)).to.eq(msg2to1);
      expect(await asyncTimeout(secondPeerReceived.wait(), 200)).to.eq(msg1to2);
    })
    .timeout(3_000);
});
