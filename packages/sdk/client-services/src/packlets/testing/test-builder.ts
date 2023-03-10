//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { asyncTimeout, Trigger } from '@dxos/async';
import { Client, ClientServices, ClientServicesProxy, createDefaultModelFactory, Invitation } from '@dxos/client';
import { Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { DocumentModel } from '@dxos/document-model';
import { DatabaseBackendProxy, genesisMutation } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { Storage } from '@dxos/random-access-storage';
import { createLinkedPorts, createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

import { ClientServicesHost, LocalClientServices } from '../services';

export const testConfigWithLocalSignal = new Config({
  version: 1,
  runtime: {
    services: {
      signal: {
        // TODO(burdon): Port numbers and global consts?
        server: 'ws://localhost:4000/.well-known/dx/signal'
      }
    }
  }
});

/**
 * Client builder supports different configurations, incl. signaling, transports, storage.
 */
export class TestBuilder {
  private readonly _config: Config;

  public storage?: Storage;

  // prettier-ignore
  constructor (
    config?: Config,
    private readonly _modelFactory = createDefaultModelFactory(),
    private readonly _signalManagerContext = new MemorySignalManagerContext()
  ) {
    this._config = config ?? new Config();
  }

  get config(): Config {
    return this._config;
  }

  /**
   * Get network manager using local shared memory or remote signal manager.
   */
  get networkManager() {
    const signalServer = this._config.get('runtime.services.signal.server');
    if (signalServer) {
      return new NetworkManager({
        log: true,
        signalManager: new WebsocketSignalManager([signalServer]),
        transportFactory: createWebRTCTransportFactory({
          iceServers: this._config.get('runtime.services.ice')
        })
      });
    }

    // Memory transport with shared context.
    return new NetworkManager({
      log: true,
      signalManager: new MemorySignalManager(this._signalManagerContext),
      transportFactory: MemoryTransportFactory
    });
  }

  /**
   * Create backend service handlers.
   */
  createClientServicesHost() {
    return new ClientServicesHost({
      config: this._config,
      modelFactory: this._modelFactory,
      networkManager: this.networkManager,
      storage: this.storage
    });
  }

  /**
   * Create local services host.
   */
  createLocal() {
    return new LocalClientServices({
      config: this._config,
      modelFactory: this._modelFactory,
      networkManager: this.networkManager,
      storage: this.storage
    });
  }

  /**
   * Create client/server.
   */
  createClientServer(host: ClientServicesHost = this.createClientServicesHost()): [Client, ProtoRpcPeer<{}>] {
    const [proxyPort, hostPort] = createLinkedPorts();
    const server = createProtoRpcPeer({
      exposed: host.descriptors,
      handlers: host.services as ClientServices,
      port: hostPort
    });
    // TODO(dmaretskyi): Refactor.

    const client = new Client({ services: new ClientServicesProxy(proxyPort) });
    return [client, server];
  }
}

export const testSpace = async (create: DatabaseBackendProxy, check: DatabaseBackendProxy = create) => {
  const objectId = PublicKey.random().toHex();

  const result = create.mutate(genesisMutation(objectId, DocumentModel.meta.type));

  await result.getReceipt();
  // TODO(dmaretskiy): await result.waitToBeProcessed()
  assert(create._itemManager.entities.has(result.objectsCreated[0].id));

  await asyncTimeout(
    check._itemManager.update.waitForCondition(() => check._itemManager.entities.has(objectId)),
    1000
  );

  return result;
};

export const syncItems = async (db1: DatabaseBackendProxy, db2: DatabaseBackendProxy) => {
  // Check item replicated from 1 => 2.
  await testSpace(db1, db2);

  // Check item replicated from 2 => 1.
  await testSpace(db2, db1);
};

export const joinCommonSpace = async ([initialPeer, ...peers]: Client[], spaceKey?: PublicKey): Promise<PublicKey> => {
  const rootSpace = spaceKey ? initialPeer.echo.getSpace(spaceKey) : await initialPeer.echo.createSpace();
  assert(rootSpace, 'Space not found.');

  await Promise.all(
    peers.map(async (peer) => {
      const success1 = new Trigger<Invitation>();
      const success2 = new Trigger<Invitation>();

      const observable1 = rootSpace.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
      log('invitation created');
      observable1.subscribe({
        onConnecting: (invitation) => {
          const observable2 = peer.echo.acceptInvitation(invitation);
          log('invitation accepted');

          observable2.subscribe({
            onSuccess: (invitation: Invitation) => {
              success2.wake(invitation);
              log('invitation success2');
            },
            onError: (err: Error) => raise(err)
          });
        },
        onSuccess: (invitation) => {
          success1.wake(invitation);
          log('invitation success1');
        },
        onError: (err) => raise(err)
      });

      await Promise.all([success1.wait(), success2.wait()]);
    })
  );

  return rootSpace.key;
};
