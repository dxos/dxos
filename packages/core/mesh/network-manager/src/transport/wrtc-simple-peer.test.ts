//
// Copyright 2020 DXOS.org
//

// @dxos/mocha nodejs

import wrtc from '@koush/wrtc';
import SimplePeerConstructor from 'simple-peer';

import { sleep } from '@dxos/async';

describe('node wrtc and simple-peer', function () {
  // Simplest test that reproduces SIGABRT (mac) and SIGSEGV (linux) in wrtc.
  it.skip('open and close', async function () {
    const peer = new SimplePeerConstructor({
      initiator: true,
      wrtc
    });

    await sleep(1);

    await peer.destroy();
  }).timeout(3_000);
});
