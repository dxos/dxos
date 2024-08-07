//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import fetchMock from 'fetch-mock';

import { test, describe } from '@dxos/test';

import { getIceServers } from './ice';

describe('Ice', () => {
  const providerUrl = 'http://localhost:8787/ice';
  const providedIceServers: RTCIceServer[] = [
    {
      urls: ['stun:stun.cloudflare.com:3478', 'turn:turn.cloudflare.com:3478?transport=udp'],
      username: 'test-user',
      credential: 'test-cred',
    },
  ];

  afterEach(() => {
    fetchMock.restore();
  });

  test('ice provider results are correctly merged', async () => {
    // set-up mock

    fetchMock.getOnce(providerUrl, { iceServers: providedIceServers });

    const iceServers = await getIceServers([{ urls: providerUrl }]);
    expect(iceServers).to.deep.eq(providedIceServers);
  });

  test('ice provider errors are handled', async () => {
    // mock error
    fetchMock.getOnce(providerUrl, 500);

    const iceServers = await getIceServers([{ urls: providerUrl }]);
    expect(iceServers).to.deep.eq([]);
  });
});
