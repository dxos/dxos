//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceId } from '@dxos/keys';

import { SqliteDatabase } from './database.ts';
import { StoreDisconnectedError } from './errors.ts';
import { RemoteStoreDriver, disconnectStorePort } from './remote.ts';

describe('RemoteStoreDriver', () => {
  test('a disconnect fails calls in flight and every later call', async ({ expect }) => {
    // No host answers on the other end, as when its worker has died.
    const { port1, port2 } = new MessageChannel();
    try {
      const driver = new RemoteStoreDriver(port1, SpaceId.random());
      const inFlight = driver.load('anything');
      disconnectStorePort(port1, 'worker stopped');
      await expect(inFlight).rejects.toThrow(StoreDisconnectedError);
      await expect(driver.counts()).rejects.toThrow('worker stopped');
    } finally {
      port1.close();
      port2.close();
    }
  });

  test('a database whose host is gone still closes', async ({ expect }) => {
    const { port1, port2 } = new MessageChannel();
    try {
      const spaceId = SpaceId.random();
      const db = SqliteDatabase.make({ spaceId, driver: new RemoteStoreDriver(port1, spaceId) });
      disconnectStorePort(port1);
      await expect(db.close()).resolves.toBeUndefined();
    } finally {
      port1.close();
      port2.close();
    }
  });
});
