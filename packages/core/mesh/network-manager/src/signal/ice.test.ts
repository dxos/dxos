//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import fetchMock from 'fetch-mock';

import { Config } from '@dxos/config';
import { test, describe } from '@dxos/test';

import { getIceServers } from './ice';

describe('Ice', () => {
  const configIceServers = [
    { urls: 'stun:kube.dxos.org:3478' },
    { urls: 'turn:kube.dxos.org:3478', username: 'dxos', credential: 'dxos' },
  ];
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

    const config = new Config({
      runtime: {
        services: {
          iceProviders: [{ url: providerUrl }],
          ice: configIceServers,
        },
      },
    });

    const iceServers = await getIceServers(config);
    expect(iceServers).to.deep.eq([...configIceServers, ...providedIceServers]);
  });

  test('ice provider errors are handled', async () => {
    // mock error
    fetchMock.getOnce(providerUrl, 500);

    const config = new Config({
      runtime: {
        services: {
          iceProviders: [{ url: providerUrl }],
          ice: configIceServers,
        },
      },
    });
    const iceServers = await getIceServers(config);
    expect(iceServers).to.deep.eq(configIceServers);
  });
});
