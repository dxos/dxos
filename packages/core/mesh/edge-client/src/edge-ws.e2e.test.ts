//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { Keyring } from '@dxos/keyring';
import { TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { openAndClose } from '@dxos/test-utils';

import { createEphemeralEdgeIdentity, createTestHaloEdgeIdentity } from './auth';
import { protocol } from './defs';
import { EdgeClient } from './edge-client';
import { type EdgeIdentity } from './edge-identity';

// Live end-to-end checks against a real edge server (`wrangler dev`), exercising the actual
// WebSocket handshake, auth challenge, and message round trip that unit tests stub out via
// `createTestEdgeWsServer`. Gated behind DX_EDGE_TEST_URL so it is skipped by default and in CI.
//
//   DX_EDGE_TEST_URL=http://localhost:8787 pnpm exec vitest run --project=node src/edge-ws.e2e.test.ts
//
// Run `pnpm run dev` in packages/services/edge (or the equivalent wrangler dev setup) first.

const EDGE_URL = process.env.DX_EDGE_TEST_URL;

const textMessage = (message: string, source?: EdgeIdentity) =>
  protocol.createMessage(TextMessageSchema, {
    source: source && { peerKey: source.peerKey, identityDid: source.identityDid },
    payload: { message },
  });

describe.skipIf(!EDGE_URL)('EdgeClient (live)', { tags: ['sync-e2e'], timeout: 60_000 }, () => {
  test('connects and authenticates with HALO identity', async ({ expect }) => {
    const keyring = new Keyring();
    const identity = await createTestHaloEdgeIdentity(keyring, await keyring.createKey(), await keyring.createKey());

    const client = new EdgeClient(identity, { socketEndpoint: EDGE_URL! });
    await openAndClose(client);
    await client.send(Context.default(), textMessage('Hello world 1'));
    expect(client.isOpen).is.true;
  });

  test('connects with ephemeral identity', async ({ expect }) => {
    const identity = await createEphemeralEdgeIdentity();

    const client = new EdgeClient(identity, { socketEndpoint: EDGE_URL! });
    await openAndClose(client);
    await client.send(Context.default(), textMessage('Hello world 1'));
    expect(client.isOpen).is.true;
  });

  test('reports connected status', async ({ expect }) => {
    const identity = await createEphemeralEdgeIdentity();

    const client = new EdgeClient(identity, { socketEndpoint: EDGE_URL! });
    await openAndClose(client);
    await expect.poll(() => client.status.state).toBe(EdgeStatus.ConnectionState.CONNECTED);
  });
});
