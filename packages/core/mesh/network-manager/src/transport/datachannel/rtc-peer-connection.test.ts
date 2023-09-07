//
// Copyright 2023 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'chai';
import nodeDataChannel from 'node-datachannel';

import { Trigger, asyncTimeout } from '@dxos/async';
import { log } from '@dxos/log';
import { afterTest, describe, test } from '@dxos/test';

import { PeerConnection } from './rtc-peer-connection';

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
      peer2.setRemoteDescription(sdp, type);
    });
    peer1.onLocalCandidate((candidate, mid) => {
      peer2.addRemoteCandidate(candidate, mid);
    });

    const peer2 = new nodeDataChannel.PeerConnection('Peer2', { iceServers: ['stun:stun.l.google.com:19302'] });
    afterTest(() => peer2.close());

    // Set Callbacks
    peer2.onLocalDescription((sdp, type) => {
      peer1.setRemoteDescription(sdp, type);
    });
    peer2.onLocalCandidate((candidate, mid) => {
      peer1.addRemoteCandidate(candidate, mid);
    });
    peer2.onDataChannel((dc) => {
      dc2 = dc;
      dc2.onMessage((msg) => secondPeerReceived.wake(msg));
      dc2.sendMessage(msg2to1);
    });

    const dc1 = peer1.createDataChannel('test');
    afterTest(() => dc1.close());

    dc1.onOpen(() => dc1.sendMessage(msg1to2));

    dc1.onMessage((msg) => firstPeerReceived.wake(msg));
    dc1.onMessage((msg) => firstPeerReceived.wake(msg));
    expect(await asyncTimeout(firstPeerReceived.wait(), 3000)).to.eq(msg2to1);
    expect(await asyncTimeout(secondPeerReceived.wait(), 3000)).to.eq(msg1to2);
  });

  test('RTCPeerConnection', async () => {
    const msg1to2 = 'Hello from Peer1';
    const firstPeerReceived = new Trigger<string | Buffer>();
    const msg2to1 = 'Hello from Peer2';
    const secondPeerReceived = new Trigger<string | Buffer>();

    const peer1 = new PeerConnection();
    afterTest(() => peer1.close());

    const peer2 = new PeerConnection();
    afterTest(() => peer2.close());

    peer1
      .createOffer()
      .then(async (offer) => {
        await peer2.setRemoteDescription(offer);
        const answer = await peer2.createAnswer();
        await peer1.setRemoteDescription(answer);
      })
      .catch((err) => {
        log.catch(err);
      });

    peer1.onicecandidate = async (env) => {
      await peer2.addIceCandidate(env.candidate?.toJSON());
    };
    peer2.onicecandidate = async (env) => {
      await peer1.addIceCandidate(env.candidate?.toJSON());
    };
    let dc2: RTCDataChannel;
    peer2.ondatachannel = ({ channel }) => {
      dc2 = channel;
      dc2.onmessage = (msg) => {
        secondPeerReceived.wake(msg.data);
      };
      dc2.send(msg2to1);
    };

    const dc1 = peer1.createDataChannel('test');
    dc1.onmessage = (msg) => {
      firstPeerReceived.wake(msg.data);
    };

    dc1.onopen = () => dc1.send(msg1to2);

    expect((await asyncTimeout(firstPeerReceived.wait(), 3000)).toString()).to.eq(msg2to1);
    expect((await asyncTimeout(secondPeerReceived.wait(), 3000)).toString()).to.eq(msg1to2);
  });
});
