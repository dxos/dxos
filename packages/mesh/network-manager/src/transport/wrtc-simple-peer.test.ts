//
// Copyright 2020 DXOS.org
//

import { it as test } from 'mocha';
import SimplePeerConstructor from 'simple-peer';
import wrtc from 'wrtc';

import { sleep } from '@dxos/async';

describe('node wrtc and simple-peer', () => {
  // Simplest test that reproduces SIGABRT in wrtc.
  test.skip('open and close', async () => {
    const peer = new SimplePeerConstructor({
      initiator: true,
      wrtc
    });

    await sleep(1);

    await peer.destroy();
  }).timeout(3_000);
});
