//
// Copyright 2024 DXOS.org
//

import { expect } from 'vitest';

import { sleep } from '@dxos/async';

import { type Transport } from '../transport';

export const handleChannelErrors = (channel: Transport) => {
  let handled = false;
  channel.errors.handle(() => (handled = true));
  return {
    expectErrorRaised: async () => {
      if (!handled) {
        await sleep(5);
      }
      expect(handled).toBeTruthy();
    },
  };
};
