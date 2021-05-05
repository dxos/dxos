//
// Copyright 2021 DXOS.org
//

import { Client, ClientConfig } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
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

export const createClient = async (config?: ClientConfig) => {
  const client = new Client(config);
  await client.initialize();
  const keypair = createKeyPair();
  await client.createProfile({ ...keypair, username: 'test-user' });
  await client.echo.open();

  return client;
};
