//
// Copyright 2023 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'chai';
import nodeDataChannel from 'node-datachannel';

import { Trigger, asyncTimeout } from '@dxos/async';
import { log } from '@dxos/log';
import { afterTest, describe, test } from '@dxos/test';

setTimeout(() => {}, 10 * 1000);

describe('Node WebRTC libdatachannel implementation', () => {
  test('Connect two datachannels', async () => {
    const msg1to2 = 'Hello from Peer1';
    const firstPeerReceived = new Trigger<string | Buffer>();
    const msg2to1 = 'Hello from Peer2';
    const secondPeerReceived = new Trigger<string | Buffer>();

    let dc2: nodeDataChannel.DataChannel;
    afterTest(() => dc2.close());

    const peer1 = new nodeDataChannel.PeerConnection('Peer1', { iceServers: ['stun:stun.l.google.com:19302'] });
    afterTest(() => peer1.close());

    // Set Callbacks
    peer1.onLocalDescription((sdp, type) => {
      log.info('Peer1 SDP:', { sdp, type });
      peer2.setRemoteDescription(sdp, type);
    });
    peer1.onLocalCandidate((candidate, mid) => {
      log.info('Peer1 Candidate:', { candidate });
      peer2.addRemoteCandidate(candidate, mid);
    });

    const peer2 = new nodeDataChannel.PeerConnection('Peer2', { iceServers: ['stun:stun.l.google.com:19302'] });
    afterTest(() => peer2.close());

    // Set Callbacks
    peer2.onLocalDescription((sdp, type) => {
      log.info('Peer2 SDP:', { sdp, type });
      peer1.setRemoteDescription(sdp, type);
    });
    peer2.onLocalCandidate((candidate, mid) => {
      log.info('Peer2 Candidate:', { candidate });
      peer1.addRemoteCandidate(candidate, mid);
    });
    peer2.onDataChannel((dc) => {
      log.info('Peer2 Got DataChannel: ', { label: dc.getLabel() });
      dc2 = dc;
      dc2.onMessage((msg) => secondPeerReceived.wake(msg));
      dc2.sendMessage(msg2to1);
    });

    const dc1 = peer1.createDataChannel('test');
    afterTest(() => dc1.close());

    dc1.onOpen(() => dc1.sendMessage(msg1to2));

    dc1.onMessage((msg) => firstPeerReceived.wake(msg));
    dc1.onMessage((msg) => firstPeerReceived.wake(msg));
    expect(await asyncTimeout(firstPeerReceived.wait(), 1000)).to.eq(msg2to1);
    expect(await asyncTimeout(secondPeerReceived.wait(), 1000)).to.eq(msg1to2);
  });

  // test.only('RTCPeerConnection', async () => {});
});
