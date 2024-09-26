//
// Copyright 2024 DXOS.org
//

import { expect } from 'vitest';

import { sleep } from '@dxos/async';

import { type RtcTransportChannel } from './rtc-transport-channel';

export const handleChannelErrors = (channel: RtcTransportChannel) => {
  let handled = false;
  channel.errors.handle(() => (handled = true));
  return {
    expectErrorRaised: async () => {
      await sleep(5);
      expect(handled).toBeTruthy();
    },
  };
};
