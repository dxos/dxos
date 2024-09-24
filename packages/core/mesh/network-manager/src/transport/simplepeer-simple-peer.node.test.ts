//
// Copyright 2020 DXOS.org
//

import wrtc from '@koush/wrtc';
import SimplePeerConstructor from 'simple-peer';
import { describe, test } from 'vitest';

import { sleep } from '@dxos/async';

describe('Node WebRTC and simple-peer', () => {
  // Simplest test that reproduces SIGABRT (mac) and SIGSEGV (linux) in wrtc.
  test.skip('open and close', { timeout: 3_000 }, async () => {
    const peer = new SimplePeerConstructor({
      initiator: true,
      wrtc,
    });

    await sleep(1);
    await peer.destroy();
  });
});
