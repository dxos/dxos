//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { Obj, Filter, Database } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import type { SpaceSyncState } from '@dxos/echo-db';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory } from '@dxos/network-manager';
import { EdgeService } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import { LocalClientServices } from '../../src/services';

const LOCAL = false;
const EDGE_URL = LOCAL ? 'http://localhost:8787' : 'https://edge.dxos.workers.dev';

const createEdgeConfig = () =>
  new Config({
    version: 1,
    runtime: {
      services: {
        edge: { url: EDGE_URL },
      },
      client: {
        edgeFeatures: {
          echoReplicator: true,
          feedReplicator: true,
          signaling: true,
          agents: true,
        },
        storage: {
          persistent: true,
          dataRoot: `/tmp/dxos-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      },
    },
  });

const createClient = (signalContext: MemorySignalManagerContext): Client => {
  const config = createEdgeConfig();
  const services = new LocalClientServices({
    config,
    signalManager: new MemorySignalManager(signalContext),
    transportFactory: MemoryTransportFactory,
  });
  return new Client({ config, services });
};

// DX_TEST_TAGS=sync-e2e moon run client:test -- --run test/e2e/edge-invitation-replication.test.ts
describe.runIf(process.env.DX_TEST_TAGS?.includes('sync-e2e'))(
  'edge replication after identity recovery',
  { timeout: 300_000, retry: 0 },
  () => {
    test('data replicates to recovered identity via edge after original peer is destroyed', async () => {
      const signalContext = new MemorySignalManagerContext();

      //
      // Client A: create identity, agent, recovery credential, add data, sync to edge, then destroy.
      //
      const clientA = createClient(signalContext);
      await clientA.initialize();
      await clientA.addTypes([TestSchema.Expando]);
      await clientA.halo.createIdentity();
      log.info('clientA identity created');

      console.log('### ClientA: creating edge agent');
      await clientA.services.services.EdgeAgentService!.createAgent(undefined, { timeout: 10_000 });
      console.log('### ClientA: edge agent created, waiting for HALO feed sync');
      await sleep(15_000);

      console.log('### ClientA: creating recovery credential');
      const { recoveryCode } = await clientA.services.services.IdentityService!.createRecoveryCredential({});
      console.log('### ClientA: recovery credential created');

      const spaceA = await clientA.spaces.create();
      await spaceA.waitUntilReady();
      await spaceA.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

      console.log('### ClientA: creating test objects');
      spaceA.db.add(Obj.make(TestSchema.Expando, { name: 'test-object-1', counter: 42 }));
      spaceA.db.add(Obj.make(TestSchema.Expando, { name: 'test-object-2', counter: 99 }));
      await spaceA.db.flush();

      console.log('### ClientA: waiting for sync to edge');
      await waitForSync(spaceA.db);
      await sleep(1_000);
      console.log('### ClientA: synced to edge');

      const hostSpaceId = spaceA.id;

      // Fully destroy Client A — no peer available.
      console.log('### ClientA: destroying');
      await clientA.destroy();
      console.log('### ClientA: destroyed\n');

      //
      // Client B: fresh client, recover identity from edge.
      //
      const clientB = createClient(signalContext);
      await clientB.initialize();
      await clientB.addTypes([TestSchema.Expando]);
      log.info('clientB initialized (no identity yet)');

      console.log('### ClientB: recovering identity');
      await clientB.halo.recoverIdentity({ recoveryCode: recoveryCode! });
      console.log('### ClientB: identity recovered');

      // Wait for spaces to appear after recovery.
      console.log('### ClientB: waiting for spaces');
      await sleep(5_000);

      const spaces = clientB.spaces.get();
      console.log(
        '### ClientB: spaces',
        spaces.map((space) => space.id),
      );

      const recoveredSpace = spaces.find((space) => space.id === hostSpaceId);
      expect(recoveredSpace, `Expected to find space ${hostSpaceId}`).to.exist;

      console.log('### ClientB: waiting for space ready');
      await Promise.race([
        recoveredSpace!.waitUntilReady(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('recoveredSpace.waitUntilReady() timed out after 60s')), 60_000),
        ),
      ]);
      log.info('clientB space ready', { spaceId: recoveredSpace!.id });

      console.log('### ClientB: waiting for sync from edge');
      await waitForSync(recoveredSpace!.db);
      console.log('### ClientB: synced from edge');

      const objects = await recoveredSpace!.db.query(Filter.type(TestSchema.Expando)).run();
      console.log(
        '### ClientB: objects found',
        objects.map((obj: any) => ({ name: obj.name, counter: obj.counter })),
      );

      expect(objects.length).toBeGreaterThanOrEqual(2);
      expect(objects.some((obj: any) => obj.name === 'test-object-1' && obj.counter === 42)).toBe(true);
      expect(objects.some((obj: any) => obj.name === 'test-object-2' && obj.counter === 99)).toBe(true);

      await clientB.destroy();
    });
  },
);

const waitForSync = async (db: Database.Database, timeout = 60_000) => {
  const start = performance.now();
  let interval: NodeJS.Timeout | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`waitForSync timed out after ${timeout}ms`));
      }, timeout);

      let lastStatus = '';
      const handleSyncState = (spaceSyncState: SpaceSyncState) => {
        const syncState = spaceSyncState.peers?.find((state) => isEdgePeerId(state.peerId, db.spaceId));
        const status = syncState
          ? `unsynced=${syncState.unsyncedDocumentCount} missingRemote=${syncState.missingOnRemote} missingLocal=${syncState.missingOnLocal} different=${syncState.differentDocuments}`
          : 'no connection to edge';
        if (status !== lastStatus) {
          console.log('  sync:', status);
          lastStatus = status;
        }

        if (
          syncState &&
          syncState.missingOnRemote === 0 &&
          syncState.missingOnLocal === 0 &&
          syncState.differentDocuments === 0
        ) {
          clearTimeout(timer);
          resolve();
        }
      };

      interval = setInterval(async () => {
        try {
          handleSyncState(await db.getSyncState());
        } catch (error) {
          console.error(error);
        }
      }, 500);

      db.getSyncState()
        .then(handleSyncState)
        .catch((error) => console.error(error));
    });
  } finally {
    if (interval !== null) {
      clearInterval(interval);
    }
  }

  console.log(`  synced in ${(performance.now() - start).toFixed(0)}ms`);
};

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);
