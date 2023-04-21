//
// Copyright 2023 DXOS.org
//

import { ConfigProto } from '@dxos/config';
import { PublicKey } from '@dxos/keys';

import { Agent } from '../agent';

const CONFIG: ConfigProto = {
  version: 1,
  runtime: {
    client: {
      storage: {
        persistent: true,
        storageType: 5,
        path: 'dxos/storage'
      }
    },
    services: {
      signaling: [
        {
          server: 'ws://localhost/.well-known/dx/signal'
        }
      ],
      ice: [
        {
          urls: 'stun:kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        },
        {
          urls: 'turn:kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        },
        {
          urls: 'stun:dev.kube.dxos.org:3478'
        },
        {
          urls: 'turn:dev.kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
    }
  }
};

export const testPeerFactory = (): Agent => {
  const config = CONFIG && { runtime: { client: { storage: { path: PublicKey.random().toString() } } } };
  return new Agent({ config });
};
