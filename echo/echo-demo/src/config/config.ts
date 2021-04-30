//
// Copyright 2021 DXOS.org
//

import { createTestInstance, TestOptions } from '@dxos/echo-db';
import { createStorage } from '@dxos/random-access-multi-storage';

export const offlineConfig: TestOptions = {
  initialize: true,
  snapshotInterval: 10
};

const DEFAULT_SIGNAL = 'wss://apollo1.kube.moon.dxos.network/dxos/signal';

export const onlineConfig: TestOptions = {
  ...offlineConfig,
  networkManagerOptions: {
    signal: [process.env.STORYBOOK_SIGNAL ?? DEFAULT_SIGNAL]
  }
};

export const createOfflineInstance = () => createTestInstance(offlineConfig);
export const createOnlineInstance = () => createTestInstance(onlineConfig);

export const createItemStorage = () => createStorage('dxos/echo-demo');
export const createSnapshotStorage = () => createStorage('dxos/echo-demo/snapshots');
