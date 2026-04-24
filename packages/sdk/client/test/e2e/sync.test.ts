//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { Stream } from '@dxos/codec-protobuf/stream';
import { Obj, Database } from '@dxos/echo';
import type { SpaceSyncState } from '@dxos/echo-db';
import { TestSchema } from '@dxos/echo/testing';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeService } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

// DX_TEST_TAGS=sync-e2e pnpm vitest run sync.test.ts
describe.runIf(process.env.DX_TEST_TAGS?.includes('sync-e2e'))('sync', { timeout: 120_000, retry: 0 }, async () => {
  test('sync stuck', async () => {
    const ITERATIONS = 10,
      BURST_SIZE = 30,
      RESTART_CLIENT = false, // restarting client doesn't work
      LOCAL = false;

    const config = new Config({
      version: 1,
      runtime: {
        services: {
          edge: { url: LOCAL ? 'http://localhost:8787' : 'https://edge.dxos.workers.dev' },
        },
        client: {
          edgeFeatures: {
            echoReplicator: true,
            feedReplicator: true,
          },
          storage: {
            persistent: true,
            dataRoot: `/tmp/dxos-${Date.now()}`,
          },
        },
      },
    });

    const client = new Client({ config });
    await client.initialize();
    await client.halo.createIdentity();

    let space = await client.spaces.create();
    await space.waitUntilReady();

    log.info('client initialized', {
      spaceId: space.id,
    });

    setInterval(async () => {
      const { status } = (await Stream.first(client.services.services.EdgeAgentService!.queryEdgeStatus())) ?? {};
      console.log(
        status?.messagesSent.toString().padStart(10),
        'sent',
        status?.messagesReceived.toString().padStart(10),
        'received',
      );
    }, 2000);

    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

    console.log('\n### Creating object');
    const obj = space.db.add(Obj.make(TestSchema.Expando, { counter: 1 }));
    const dxn = Obj.getDXN(obj);
    await waitForSync(space.db);

    for (let i = 0; i < ITERATIONS; i++) {
      console.log('\n### Iteration', i);
      const obj = await space.db.makeRef(dxn).load();
      for (let j = 0; j < BURST_SIZE; j++) {
        obj.counter++;
        await sleep(20);
      }
      await space.db.flush();
      await waitForSync(space.db); // its likely that this could miss the mutation and stil report that the sync has completed

      if (RESTART_CLIENT) {
        await client.destroy();
        await client.initialize();
        space = client.spaces.get()[0]!;
      }
    }
  });
});

const waitForSync = async (db: Database.Database) => {
  let spaceSyncState: SpaceSyncState | null = null;

  const start = performance.now();
  let interval: NodeJS.Timeout | null = null;
  try {
    await new Promise<void>(async (resolve) => {
      let lastStatus: string = '';
      const handleSyncState = (spaceSyncState: SpaceSyncState) => {
        const syncState = spaceSyncState.peers?.find((state) => isEdgePeerId(state.peerId, db.spaceId));
        const status = String(syncState?.unsyncedDocumentCount ?? 'no connection to edge');
        if (status !== lastStatus) {
          console.log('syncing:', status);
          lastStatus = status;
        }

        if (
          syncState &&
          syncState.missingOnRemote === 0 &&
          syncState.missingOnLocal === 0 &&
          syncState.differentDocuments === 0
        ) {
          resolve();
        }
      };

      interval = setInterval(async () => {
        try {
          spaceSyncState = await db.getSyncState();
          handleSyncState(spaceSyncState);
        } catch (error) {
          console.error(error);
        }
      }, 500);

      try {
        spaceSyncState = await db.getSyncState();
        handleSyncState(spaceSyncState);
      } catch (error) {
        console.error(error);
      }
    });
  } finally {
    if (interval !== null) {
      clearInterval(interval);
    }
  }

  const duration = performance.now() - start;
  console.log('Synced in', duration.toFixed(0), 'ms');
};

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);
