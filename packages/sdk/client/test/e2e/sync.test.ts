import { describe, test } from 'vitest';
import { Client, Config } from '@dxos/client';
import { Obj, Type } from '@dxos/echo';
import type { EchoDatabase, SpaceSyncState } from '@dxos/echo-db';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import type { SpaceId } from '@dxos/keys';
import { EdgeService } from '@dxos/protocols';

describe.runIf(process.env.DX_TEST_TAGS?.includes('sync-e2e'))('sync', { timeout: 120_000 }, async () => {
  test('sync stuck', async () => {
    const ITERATIONS = 100;

    const config = new Config({
      version: 1,
      runtime: {
        services: {
          edge: { url: 'https://edge.dxos.workers.dev' },
        },
        client: {
          edgeFeatures: {
            echoReplicator: true,
            feedReplicator: true,
          },
        },
      },
    });

    const client = new Client({ config });
    await client.initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

    console.log('\n### Creating object');
    const obj = space.db.add(Obj.make(Type.Expando, { counter: 1 }));
    await waitForSync(space.db);

    for (let i = 0; i < ITERATIONS; i++) {
      console.log('\n### Iteration', i);
      obj.counter++;
      await space.db.flush();
      await waitForSync(space.db); // its likely that this could miss the mutation and stil report that the sync has completed
    }
  });
});

const waitForSync = async (db: EchoDatabase) => {
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
