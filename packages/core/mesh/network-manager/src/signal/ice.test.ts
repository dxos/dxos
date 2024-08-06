//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import fetchMock from 'fetch-mock';

import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { test, describe } from '@dxos/test';

import { getIceServers } from './ice';

describe('Ice', () => {
  afterEach(() => {
    fetchMock.reset();
  });

  test.only('ice provider results are correctlly merged', async () => {
    // set-up mock
    const providedIceServers = [
      {
        urls: ['stun:stun.cloudflare.com:3478', 'turn:turn.cloudflare.com:3478?transport=udp'],
        username: 'test-user',
        credential: 'test-cred',
      },
    ];
    fetchMock.getOnce('http://localhost:8787/ice', { iceServers: providedIceServers });

    const configIceServers = [
      { urls: 'stun:kube.dxos.org:3478' },
      { urls: 'turn:kube.dxos.org:3478', username: 'dxos', credential: 'dxos' },
    ];
    const config = new Config({
      runtime: {
        services: {
          iceProviders: [{ url: 'http://localhost:8787/ice' }],
          ice: configIceServers,
        },
      },
    });

    const iceServers = await getIceServers(config);
    log.info('iceServers', { iceServers });
    expect(iceServers).to.deep.eq([...configIceServers, ...providedIceServers]);
  });
});
