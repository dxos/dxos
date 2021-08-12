//
// Copyright 2021 DXOS.org
//

export type StorageType = 'ram' | 'idb' | 'chrome' | 'firefox' | 'node';
export type KeyStorageType = 'ram' | 'leveljs' | 'jsondown';

export interface ConfigSchema {
  storage?: {
    persistent?: boolean,
    type?: StorageType,
    keyStorage?: KeyStorageType,
    path?: string
  },
  swarm?: {
    signal?: string | string[],
    ice?: {
      urls: string,
      username?: string,
      credential?: string,
    }[],
  },
  wns?: {
    server: string,
    chainId: string,
  },
  ipfs?: {
    server: string,
    gateway: string,
  }
  snapshots?: boolean
  snapshotInterval?: number,
  invitationExpiration?: number,
  [key: string]: any
}
