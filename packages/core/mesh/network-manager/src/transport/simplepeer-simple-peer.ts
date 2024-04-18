//
// Copyright 2020 DXOS.org
//

// @dxos/test platform=nodejs

import wrtc from '@koush/wrtc';
import SimplePeerConstructor from 'simple-peer';

import { sleep } from '@dxos/async';
import { describe, test } from 'vitest';

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
