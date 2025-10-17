import { describe, test } from 'vitest';
import { Client, Config } from '@dxos/client';
import { Obj, Type } from '@dxos/echo';
import type { EchoDatabase, SpaceSyncState } from '@dxos/echo-db';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import type { SpaceId } from '@dxos/keys';
import { EdgeService } from '@dxos/protocols';
import { sleep } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';

// DX_TEST_TAGS=sync-e2e pnpm vitest run sync.test.ts
describe.runIf(process.env.DX_TEST_TAGS?.includes('sync-e2e'))('sync', { timeout: 120_000, retry: 0 }, async () => {
  test('sync stuck', async () => {
    const ITERATIONS = 100,
      BURST_SIZE = 30,
      RESTART_CLIENT = false,
      LOCAL = false; // restarting client doesn't work

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

    setInterval(async () => {
      const { status } = (await Stream.first(client.services.services.EdgeAgentService!.queryEdgeStatus())) ?? {};
      console.log(
        status?.messagesSent.toString().padStart(10),
        'sent',
        status?.messagesReceived.toString().padStart(10),
        'received',
      );
    }, 2000);

    await client.spaces.default.waitUntilReady();
    await client.spaces.default.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

    console.log('\n### Creating object');
    const obj = client.spaces.default.db.add(Obj.make(Type.Expando, { counter: 1 }));
    const dxn = Obj.getDXN(obj);
    await waitForSync(client.spaces.default.db);

    for (let i = 0; i < ITERATIONS; i++) {
      console.log('\n### Iteration', i);
      const obj = await client.spaces.default.db.ref(dxn).load();
      for (let j = 0; j < BURST_SIZE; j++) {
        obj.counter++;
        await sleep(20);
      }
      await client.spaces.default.db.flush();
      await waitForSync(client.spaces.default.db); // its likely that this could miss the mutation and stil report that the sync has completed

      if (RESTART_CLIENT) {
        await client.destroy();
        await client.initialize();
        if (!client.spaces.isReady.get()) {
          await client.spaces.isReady.wait();
        }
        await client.spaces.default.waitUntilReady();
      }
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
