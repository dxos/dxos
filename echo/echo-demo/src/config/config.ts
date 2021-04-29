//
// Copyright 2021 DXOS.org
//

import { createTestInstance, TestOptions } from '@dxos/echo-db';
import { createStorage } from '@dxos/random-access-multi-storage';

export const offlineConfig: TestOptions = {
  initialize: true,
  snapshotInterval: 10
};

// TODO(burdon): Use default or local server? Add docs.
export const onlineConfig: TestOptions = {
  ...offlineConfig,
  networkManagerOptions: {
    signal: ['wss://apollo1.kube.moon.dxos.network/dxos/signal'],
    ice: [{ urls: 'turn:apollo1.kube.moon.dxos.network:3478', username: 'dxos', credential: 'dxos' }]
  }
};

export const createOfflineInstance = () => createTestInstance(offlineConfig);
export const createOnlineInstance = () => createTestInstance(onlineConfig);

export const createItemStorage = () => createStorage('dxos/echo-demo');
export const createSnapshotStorage = () => createStorage('dxos/echo-demo/snapshots');
