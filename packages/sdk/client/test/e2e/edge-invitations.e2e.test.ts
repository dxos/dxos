//
// Copyright 2026 DXOS.org
//

// Full-stack e2e test against a REAL local edge server (Cloudflare Worker + Durable Objects).
// Boots two independent DXOS `Client` instances (real ECHO/HALO bootstrapping) and exercises the
// invitation flows (space invitation, HALO device invitation) over the edge WS router (swarm
// signaling via `EdgeSignalManager`).
//
// Skipped entirely unless `DX_EDGE_TEST_URL` is set, so it never runs in CI. Run locally with:
//
// moon run client:test -- edge-invitations.e2e.test.ts
//
// Or directly against a running edge worker via vitest (from packages/sdk/client):
//
// DX_EDGE_TEST_URL=http://localhost:8787 pnpm exec vitest run --project=node test/e2e/edge-invitations.e2e.test.ts

import { describe, test } from 'vitest';

import { asyncTimeout, sleep, waitForCondition } from '@dxos/async';
import { Client, Config, LocalClientServices } from '@dxos/client';
import { performInvitation } from '@dxos/client-services/testing';
import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { log } from '@dxos/log';
import { MemoryTransportFactory } from '@dxos/network-manager';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

const EDGE_URL = process.env.DX_EDGE_TEST_URL;

const createEdgeConfig = () =>
  new Config({
    version: 1,
    runtime: {
      services: {
        edge: { url: EDGE_URL! },
      },
      client: {
        edgeFeatures: {
          subductionReplicator: true,
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

// Two independent clients each get their own `LocalClientServices`. Signaling is real (routed
// through the edge worker via `EdgeSignalManager`, selected by `edgeFeatures.signaling`), but the
// peer-to-peer data transport is forced to memory to dodge the known node-datachannel SIGSEGV
// when two real WebRTC stacks run in the same Node process (see
// packages/sdk/client/src/services/local-client-services.ts).
const createClient = (): Client => {
  const config = createEdgeConfig();
  const services = new LocalClientServices({
    config,
    transportFactory: MemoryTransportFactory,
  });
  return new Client({ config, services });
};

describe.skipIf(!EDGE_URL)('edge invitations', { timeout: 120_000, retry: 0, tags: ['sync-e2e'] }, () => {
  test('space invitation between two identities', async ({ expect }) => {
    const clientA = createClient();
    const clientB = createClient();

    try {
      await clientA.initialize();
      await clientA.addTypes([TestSchema.Expando]);
      await clientA.halo.createIdentity({ displayName: 'host' });
      log.info('clientA identity created');

      await clientB.initialize();
      await clientB.addTypes([TestSchema.Expando]);
      await clientB.halo.createIdentity({ displayName: 'guest' });
      log.info('clientB identity created');

      const spaceA = await clientA.spaces.create();
      await spaceA.waitUntilReady();
      log.info('clientA space ready', { spaceId: spaceA.id });

      const object = spaceA.db.add(Obj.make(TestSchema.Expando, { name: 'invitation-test-object', counter: 7 }));
      const objectId = Obj.getURI(object).toString();
      await spaceA.db.flush();

      console.log('### clientA -> clientB: space invitation');
      const [hostResult, guestResult] = await asyncTimeout(
        Promise.all(
          performInvitation({
            host: spaceA,
            guest: clientB.spaces,
            options: { authMethod: Invitation.AuthMethod.NONE },
          }),
        ),
        60_000,
        new Error('space invitation timed out'),
      );

      expect(hostResult.error, `host invitation error: ${hostResult.error?.message}`).to.be.undefined;
      expect(guestResult.error, `guest invitation error: ${guestResult.error?.message}`).to.be.undefined;
      expect(hostResult.invitation?.state).to.equal(Invitation.State.SUCCESS);
      expect(guestResult.invitation?.state).to.equal(Invitation.State.SUCCESS);
      expect(guestResult.invitation?.spaceKey).to.deep.equal(spaceA.key);

      const spaceB = await waitForCondition({
        condition: () => clientB.spaces.get(spaceA.key),
        timeout: 30_000,
      });
      await spaceB.waitUntilReady();
      log.info('clientB space ready', { spaceId: spaceB.id });

      const replicatedObject = await waitForCondition({
        condition: async () => {
          const objects = await spaceB.db.query(Filter.type(TestSchema.Expando)).run();
          return objects.find((candidate: any) => Obj.getURI(candidate).toString() === objectId);
        },
        timeout: 60_000,
        interval: 500,
      });

      expect((replicatedObject as any).name).to.equal('invitation-test-object');
      expect((replicatedObject as any).counter).to.equal(7);
    } finally {
      await Promise.race([Promise.all([clientA.destroy(), clientB.destroy()]), sleep(15_000)]);
    }
  });

  test('halo device invitation joins second client to same identity', async ({ expect }) => {
    const clientA = createClient();
    const clientB = createClient();

    try {
      await clientA.initialize();
      await clientA.halo.createIdentity({ displayName: 'primary-device' });
      const identityKey = clientA.halo.identity.get()?.identityKey;
      expect(identityKey, 'clientA identity key must exist').to.exist;
      log.info('clientA identity created', { identityKey: identityKey?.truncate() });

      await clientB.initialize();
      // clientB has no identity yet — the device invitation should admit it as a new device.

      console.log('### clientA -> clientB: halo device invitation');
      const [hostResult, guestResult] = await asyncTimeout(
        Promise.all(
          performInvitation({
            host: clientA.halo,
            guest: clientB.halo,
            options: { authMethod: Invitation.AuthMethod.NONE },
            guestDeviceProfile: { label: 'secondary-device' },
          }),
        ),
        60_000,
        new Error('halo device invitation timed out'),
      );

      expect(hostResult.error, `host invitation error: ${hostResult.error?.message}`).to.be.undefined;
      expect(guestResult.error, `guest invitation error: ${guestResult.error?.message}`).to.be.undefined;
      expect(hostResult.invitation?.state).to.equal(Invitation.State.SUCCESS);
      expect(guestResult.invitation?.state).to.equal(Invitation.State.SUCCESS);

      await waitForCondition({
        condition: () => clientB.halo.identity.get()?.identityKey,
        timeout: 30_000,
      });

      expect(clientB.halo.identity.get()?.identityKey).to.deep.equal(identityKey);
      expect(clientB.halo.device?.profile?.label).to.equal('secondary-device');

      const devicesA = await waitForCondition({
        condition: () => (clientA.halo.devices.get().length >= 2 ? clientA.halo.devices.get() : undefined),
        timeout: 30_000,
      });
      expect(devicesA.length).to.be.greaterThanOrEqual(2);
    } finally {
      await Promise.race([Promise.all([clientA.destroy(), clientB.destroy()]), sleep(15_000)]);
    }
  });
});
