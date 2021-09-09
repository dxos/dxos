//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { discoveryKey, PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { afterTest } from '@dxos/testutils';

import { TestProtocolPlugin, testProtocolProvider } from '../testing/test-protocol';
import { WebrtcTransport } from './webrtc-transport';
import { Duplex } from 'stream';
import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';
import wrtc from 'wrtc';


describe('node wrtc and simple-peer', () => {
  // Simplest test that reproduces SIGABRT in wrtc.
  test.skip('open and close', async () => {
    const peer = new SimplePeerConstructor({
      initiator: true,
      wrtc,
    });

    await sleep(1);

    await peer.destroy()
  }).timeout(3_000);
});
