//
// Copyright 2021 DXOS.org
//

import { createTestInstance, TestOptions } from '@dxos/echo-db';

export const offlineConfig: TestOptions = {
  initialize: true
};

export const onlineConfig: TestOptions = {
  initialize: true,
  networkManagerOptions: {
    signal: ['wss://apollo1.kube.moon.dxos.network/dxos/signal'],
    ice: [{ urls: 'turn:apollo1.kube.moon.dxos.network:3478', username: 'dxos', credential: 'dxos' }]
  }
};

export const createOfflineInstance = () => createTestInstance(offlineConfig);
export const createOnlineInstance = () => createTestInstance(onlineConfig);
