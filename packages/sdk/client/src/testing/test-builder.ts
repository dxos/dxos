//
// Copyright 2020 DXOS.org
//

import { asyncTimeout, Trigger } from '@dxos/async';
import { ClientServices } from '@dxos/client-protocol';
import { ClientServicesHost } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { DocumentModel } from '@dxos/document-model';
import { DatabaseProxy, genesisMutation } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, MemoryTransportFactory } from '@dxos/network-manager';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { Storage } from '@dxos/random-access-storage';
import { createLinkedPorts, createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

import { Client } from '../client';
import { createDefaultModelFactory } from '../echo';
import { ClientServicesProxy, LocalClientServices } from '../services';

export const testConfigWithLocalSignal = new Config({
  version: 1,
  runtime: {
    services: {
      signaling: [
        {
          // TODO(burdon): Port numbers and global consts?
          server: `ws://localhost:${process.env.SIGNAL_PORT ?? 4000}/.well-known/dx/signal`,
        },
      ],
    },
  },
});

/**
 * Client builder supports different configurations, incl. signaling, transports, storage.
 */
export class TestBuilder {
  public config: Config;

  public storage?: Storage;

  // prettier-ignore
  constructor (
    config?: Config,
    private readonly _modelFactory = createDefaultModelFactory(),
    public signalManagerContext = new MemorySignalManagerContext()
  ) {
    this.config = config ?? new Config();
  }

  /**
   * Get network manager using local shared memory or remote signal manager.
   */
  private get networking() {
    const signals = this.config.get('runtime.services.signaling');
    if (signals) {
      return {
        signalManager: new WebsocketSignalManager(signals),
        transportFactory: createWebRTCTransportFactory({
          iceServers: this.config.get('runtime.services.ice'),
        }),
      };
    }

    // Memory transport with shared context.
    return {
      signalManager: new MemorySignalManager(this.signalManagerContext),
      transportFactory: MemoryTransportFactory,
    };
  }

  /**
   * Create backend service handlers.
   */
  createClientServicesHost() {
    return new ClientServicesHost({
      config: this.config,
      modelFactory: this._modelFactory,
      storage: this.storage,
      ...this.networking,
    });
  }

  /**
   * Create local services host.
   */
  createLocal() {
    return new LocalClientServices({
      config: this.config,
      modelFactory: this._modelFactory,
      storage: this.storage,
      ...this.networking,
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
      port: hostPort,
    });
    // TODO(dmaretskyi): Refactor.

    const client = new Client({ services: new ClientServicesProxy(proxyPort) });
    return [client, server];
  }
}

export const testSpace = async (create: DatabaseProxy, check: DatabaseProxy = create) => {
  const objectId = PublicKey.random().toHex();

  const result = create.mutate(genesisMutation(objectId, DocumentModel.meta.type));

  await result.batch.getReceipt();
  // TODO(dmaretskiy): await result.waitToBeProcessed()
  invariant(create._itemManager.entities.has(result.objectsUpdated[0].id));

  await asyncTimeout(
    check.itemUpdate.waitForCondition(() => check._itemManager.entities.has(objectId)),
    1000,
  );

  return result;
};

export const syncItems = async (db1: DatabaseProxy, db2: DatabaseProxy) => {
  // Check item replicated from 1 => 2.
  await testSpace(db1, db2);

  // Check item replicated from 2 => 1.
  await testSpace(db2, db1);
};

/**
 * @deprecated use `@dxos/client-services/testing` `performInvitation` instead.
 */
export const joinCommonSpace = async ([initialPeer, ...peers]: Client[], spaceKey?: PublicKey): Promise<PublicKey> => {
  const rootSpace = spaceKey ? initialPeer.getSpace(spaceKey) : await initialPeer.createSpace();
  invariant(rootSpace, 'Space not found.');

  await Promise.all(
    peers.map(async (peer) => {
      const hostDone = new Trigger<Invitation>();
      const guestDone = new Trigger<Invitation>();

      const hostObservable = rootSpace.createInvitation({ authMethod: Invitation.AuthMethod.NONE });
      log('invitation created');
      hostObservable.subscribe(
        (hostInvitation) => {
          switch (hostInvitation.state) {
            case Invitation.State.CONNECTING: {
              const guestObservable = peer.acceptInvitation(hostInvitation);
              log('invitation accepted');

              guestObservable.subscribe(
                (guestInvitation) => {
                  switch (guestInvitation.state) {
                    case Invitation.State.SUCCESS: {
                      guestDone.wake(guestInvitation);
                      log('invitation guestDone');
                      break;
                    }
                  }
                },
                (err) => raise(err),
              );
              break;
            }

            case Invitation.State.SUCCESS: {
              hostDone.wake(hostInvitation);
              log('invitation hostDone');
            }
          }
        },
        (err) => raise(err),
      );

      await Promise.all([hostDone.wait(), guestDone.wait()]);
    }),
  );

  return rootSpace.key;
};
