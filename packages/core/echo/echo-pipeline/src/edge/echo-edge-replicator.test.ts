import { describe, test } from 'vitest';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { createEphemeralEdgeIdentity, EdgeClient, MessageSchema } from '@dxos/edge-client';
import { createBuf } from '@dxos/protocols/buf';
import { openAndClose } from '@dxos/test-utils';
import { EchoEdgeReplicator } from './echo-edge-replicator';
import { PublicKey, SpaceId } from '@dxos/keys';
import type { EchoReplicatorContext } from '../automerge';
import { Event } from '@dxos/async';
import { EdgeService } from '@dxos/protocols';
import * as A from '@dxos/automerge/automerge';
import type { AutomergeProtocolMessage } from '@dxos/protocols/src';
import { cbor } from '@dxos/automerge/automerge-repo';
import type { Peer } from '@dxos/protocols/proto/dxos/edge/messenger';

describe('EchoEdgeReplicator', () => {
  test.only('reconnects', async ({ onTestFinished }) => {
    const { closeConnection, endpoint, cleanup, sendMessage } = await createTestEdgeWsServer(8001);
    onTestFinished(cleanup);
    const client = new EdgeClient(await createEphemeralEdgeIdentity(), { socketEndpoint: endpoint });
    await openAndClose(client);

    const spaceId = SpaceId.random();

    const replicator = new EchoEdgeReplicator({ edgeConnection: client });
    const { context, connectionOpen } = createMockContext();
    await replicator.connect(context);
    await replicator.connectToSpace(spaceId);

    client.setIdentity(await createEphemeralEdgeIdentity());
    await connectionOpen.waitForCount(1);

    sendMessage(
      createForbiddenMessage(
        {
          identityKey: client.identityKey,
          peerKey: client.peerKey,
        },
        spaceId,
      ),
    );
    await connectionOpen.waitForCount(1);

    // Double restart to check for race conditions.
    client.setIdentity(await createEphemeralEdgeIdentity());
    sendMessage(
      createForbiddenMessage(
        {
          identityKey: client.identityKey,
          peerKey: client.peerKey,
        },
        spaceId,
      ),
    );
    await connectionOpen.waitForCount(1);

    await replicator.disconnect();
  });
});

const createMockContext = () => {
  const connectionOpen = new Event();
  return {
    context: {
      async getContainingSpaceIdForDocument(documentId) {
        return null;
      },
      async getContainingSpaceForDocument(documentId) {
        return null;
      },
      onConnectionAuthScopeChanged(connection) {},
      async isDocumentInRemoteCollection(params) {
        return false;
      },
      onConnectionClosed(connection) {},
      onConnectionOpen(connection) {
        connectionOpen.emit();
      },

      peerId: PublicKey.random().toHex(),
    } satisfies EchoReplicatorContext,

    connectionOpen,
  };
};

const createForbiddenMessage = (target: Peer, spaceId: SpaceId) =>
  createBuf(MessageSchema, {
    target: [target],
    serviceId: `${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`,
    payload: {
      value: cbor.encode({
        type: 'error',
        message: 'Forbidden',
      } satisfies AutomergeProtocolMessage),
    },
  });
