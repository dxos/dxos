//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { EdgeClient, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import { PublicKey } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';

import { createMessage, expectPeerAvailable, expectPeerLeft, expectReceivedMessage } from '../testing';
import { EdgeSignalManager } from './edge-signal-manager';

// Live end-to-end checks against a real edge server (`wrangler dev`), exercising
// EdgeSignalManager over an actual EdgeClient WebSocket connection rather than the in-memory
// swarm used by unit tests. Gated behind DX_EDGE_TEST_URL so it is skipped by default and in CI.
//
//   DX_EDGE_TEST_URL=http://localhost:8787 pnpm exec vitest run --project=node src/signal-manager/edge-signal-manager.e2e.test.ts
//
// Run `pnpm run dev` in packages/services/edge (or the equivalent wrangler dev setup) first.

const EDGE_URL = process.env.DX_EDGE_TEST_URL;

/**
 * Creates an EdgeClient + EdgeSignalManager pair over a real edge connection, registering
 * cleanup so the connection closes even if the test fails partway through.
 */
const createConnectedSignalManager = async () => {
  const identity = await createEphemeralEdgeIdentity();
  const edgeConnection = new EdgeClient(identity, { socketEndpoint: EDGE_URL! });
  await openAndClose(edgeConnection);

  const signalManager = new EdgeSignalManager({ edgeConnection });
  await openAndClose(signalManager);

  return { edgeConnection, signalManager, peer: { peerKey: identity.peerKey, identityDid: identity.identityDid } };
};

describe.skipIf(!EDGE_URL)('EdgeSignalManager (live)', { tags: ['sync-e2e'], timeout: 60_000 }, () => {
  test('two peers joining a swarm discover each other', async ({ expect }) => {
    const topic = PublicKey.random();
    const peerA = await createConnectedSignalManager();
    const peerB = await createConnectedSignalManager();

    const discoveredByA = expectPeerAvailable(peerA.signalManager, topic, peerB.peer);
    const discoveredByB = expectPeerAvailable(peerB.signalManager, topic, peerA.peer);

    await peerA.signalManager.join(Context.default(), { topic, peer: peerA.peer });
    await peerB.signalManager.join(Context.default(), { topic, peer: peerB.peer });

    await Promise.all([discoveredByA, discoveredByB]);
    expect(true).is.true;
  });

  test('delivers direct point-to-point message', async ({ expect }) => {
    const peerA = await createConnectedSignalManager();
    const peerB = await createConnectedSignalManager();

    const message = createMessage(peerA.peer, peerB.peer);
    const received = expectReceivedMessage(peerB.signalManager.onMessage, message);

    await peerA.signalManager.sendMessage(Context.default(), message);

    // The wire round trip returns a plain Uint8Array rather than a Buffer, so compare bytes.
    const receivedMessage = await received;
    expect(Array.from(receivedMessage.payload.value)).toStrictEqual(Array.from(message.payload.value));
  });

  test('leave removes peer from swarm', async ({ expect }) => {
    const topic = PublicKey.random();
    const peerA = await createConnectedSignalManager();
    const peerB = await createConnectedSignalManager();
    onTestFinished(async () => {
      // `leave` was already called for peerA below; only peerB may still be joined.
      await peerB.signalManager.leave(Context.default(), { topic, peer: peerB.peer });
    });

    const discoveredByB = expectPeerAvailable(peerB.signalManager, topic, peerA.peer);
    await peerA.signalManager.join(Context.default(), { topic, peer: peerA.peer });
    await peerB.signalManager.join(Context.default(), { topic, peer: peerB.peer });
    await discoveredByB;

    const leftForB = expectPeerLeft(peerB.signalManager, topic, peerA.peer);
    await peerA.signalManager.leave(Context.default(), { topic, peer: peerA.peer });

    await leftForB;
    expect(true).is.true;
  });
});
